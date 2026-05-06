from __future__ import annotations

import base64
import io
import logging
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import numpy as np
from PIL import Image, ImageFilter, ImageOps

logger = logging.getLogger(__name__)

try:
    import onnxruntime as ort
except Exception:  # pragma: no cover - dependency may be unavailable in local dev
    ort = None

try:
    from insightface.app import FaceAnalysis
except Exception:  # pragma: no cover - dependency may be unavailable in local dev
    FaceAnalysis = None


SIMILARITY_AUTO_APPROVE = 0.85
SIMILARITY_RETRY_MIN = 0.70
MIN_DETECTION_SCORE = 0.45
MIN_BRIGHTNESS = 55
MIN_SHARPNESS = 18
MIN_FACE_RATIO = 0.06
MAX_FACE_RATIO = 0.45
MAX_CENTER_OFFSET = 0.22


@dataclass
class FaceEmbeddingRecord:
    template_id: str
    employee_id: str
    employee_name: str
    descriptor: np.ndarray
    pose_label: str = "frontal"
    quality_score: float = 0.0
    detection_score: float = 0.0
    employee: Optional[Dict[str, Any]] = None


class FaceRecognitionService:
    def __init__(self) -> None:
        self._app: Optional[Any] = None
        self._available = False
        self._flat_embeddings: List[FaceEmbeddingRecord] = []
        self._by_employee: Dict[str, List[FaceEmbeddingRecord]] = {}
        self._onnx_providers = ["CPUExecutionProvider"]
        self._thread_options = {
            "intra_op_num_threads": int(os.environ.get("FACE_ORT_INTRA_THREADS", "4")),
            "inter_op_num_threads": int(os.environ.get("FACE_ORT_INTER_THREADS", "2")),
        }

    @property
    def available(self) -> bool:
        return self._available

    @property
    def cache_size(self) -> int:
        return len(self._flat_embeddings)

    @property
    def cached_employee_count(self) -> int:
        return len(self._by_employee)

    def initialize_runtime(self) -> None:
        if self._app is not None:
            return

        if FaceAnalysis is None or ort is None:
            logger.warning("InsightFace/onnxruntime indisponiveis; reconhecimento facial backend desativado.")
            self._available = False
            return

        try:
            sess_options = ort.SessionOptions()
            sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            sess_options.intra_op_num_threads = self._thread_options["intra_op_num_threads"]
            sess_options.inter_op_num_threads = self._thread_options["inter_op_num_threads"]

            self._app = FaceAnalysis(
                name=os.environ.get("INSIGHTFACE_MODEL_NAME", "buffalo_l"),
                providers=self._onnx_providers,
                allowed_modules=["detection", "recognition"],
                session_options=sess_options,
            )
            det_size = int(os.environ.get("INSIGHTFACE_DET_SIZE", "640"))
            self._app.prepare(ctx_id=0, det_size=(det_size, det_size))
            self._available = True
            logger.info("InsightFace inicializado com provider CPUExecutionProvider.")
        except Exception as error:  # pragma: no cover - runtime-specific
            logger.exception("Falha ao inicializar InsightFace: %s", error)
            self._app = None
            self._available = False

    async def initialize_cache(self, db: Any) -> None:
        self.initialize_runtime()
        await self.reload_cache(db)

    async def reload_cache(self, db: Any) -> None:
        templates = await db.facial_templates.find({}).to_list(5000)
        employee_ids = []
        for template in templates:
            employee_id = template.get("employee_id")
            if employee_id:
                employee_ids.append(employee_id)

        employees = await db.employees.find({"_id": {"$in": list(set(employee_ids))}}).to_list(5000)
        employee_map = {str(employee["_id"]): employee for employee in employees}

        flat_embeddings: List[FaceEmbeddingRecord] = []
        by_employee: Dict[str, List[FaceEmbeddingRecord]] = {}

        for template in templates:
            try:
                descriptor = np.asarray(self._parse_descriptor(template.get("descriptor")), dtype=np.float32)
                if descriptor.size < 256:
                    logger.info("Template facial legado ignorado por dimensao incompatível: %s", descriptor.size)
                    continue
                employee_id = str(template.get("employee_id"))
                employee = employee_map.get(employee_id)
                if employee is None:
                    continue

                record = FaceEmbeddingRecord(
                    template_id=str(template["_id"]),
                    employee_id=employee_id,
                    employee_name=employee.get("full_name", "Desconhecido"),
                    descriptor=descriptor,
                    pose_label=template.get("pose_label") or "frontal",
                    quality_score=float(template.get("quality_score") or 0.0),
                    detection_score=float(template.get("detection_score") or 0.0),
                    employee=employee,
                )
                flat_embeddings.append(record)
                by_employee.setdefault(employee_id, []).append(record)
            except Exception as error:
                logger.warning("Template facial ignorado no cache: %s", error)

        self._flat_embeddings = flat_embeddings
        self._by_employee = by_employee
        logger.info("Cache facial carregado com %s embeddings de %s colaboradores.", len(flat_embeddings), len(by_employee))

    async def refresh_employee_cache(self, db: Any, employee_id: str) -> None:
        await self.reload_cache(db)

    def _parse_descriptor(self, raw_descriptor: Any) -> List[float]:
        if isinstance(raw_descriptor, str):
            import json

            return json.loads(raw_descriptor)
        return list(raw_descriptor or [])

    def descriptor_dimension(self, raw_descriptor: Any) -> int:
        try:
            return len(self._parse_descriptor(raw_descriptor))
        except Exception:
            return 0

    def is_descriptor_compatible(self, raw_descriptor: Any) -> bool:
        return self.descriptor_dimension(raw_descriptor) >= 256

    async def get_migration_status(self, db: Any) -> Dict[str, Any]:
        templates = await db.facial_templates.find({}).to_list(5000)
        employee_ids = []
        for template in templates:
            employee_id = template.get("employee_id")
            if employee_id:
                employee_ids.append(employee_id)

        employees = await db.employees.find({"_id": {"$in": list(set(employee_ids))}}).to_list(5000)
        employee_map = {str(employee["_id"]): employee for employee in employees}

        summary: Dict[str, Dict[str, Any]] = {}
        compatible_templates = 0
        legacy_templates = 0

        for template in templates:
            employee_id = str(template.get("employee_id"))
            employee = employee_map.get(employee_id)
            if employee is None:
                continue

            item = summary.setdefault(
                employee_id,
                {
                    "employee_id": employee_id,
                    "employee_name": employee.get("full_name", "Desconhecido"),
                    "total_templates": 0,
                    "compatible_templates": 0,
                    "legacy_templates": 0,
                    "needs_reenrollment": False,
                },
            )
            item["total_templates"] += 1

            if self.is_descriptor_compatible(template.get("descriptor")):
                item["compatible_templates"] += 1
                compatible_templates += 1
            else:
                item["legacy_templates"] += 1
                item["needs_reenrollment"] = True
                legacy_templates += 1

        employees_list = sorted(summary.values(), key=lambda item: item["employee_name"].lower())
        employees_ready = sum(1 for item in employees_list if item["compatible_templates"] > 0)
        employees_needing_reenrollment = sum(1 for item in employees_list if item["needs_reenrollment"] or item["compatible_templates"] == 0)

        return {
            "service_available": self.available,
            "cache_size": self.cache_size,
            "total_templates": len(templates),
            "compatible_templates": compatible_templates,
            "legacy_templates": legacy_templates,
            "employees_with_templates": len(employees_list),
            "employees_ready": employees_ready,
            "employees_needing_reenrollment": employees_needing_reenrollment,
            "employees": employees_list,
        }

    def decode_base64_image(self, image_base64: str) -> np.ndarray:
        if "," in image_base64:
            image_base64 = image_base64.split(",", 1)[1]

        image_bytes = base64.b64decode(image_base64)
        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        return np.asarray(pil_image)[:, :, ::-1]

    def _brightness_and_sharpness(self, image_bgr: np.ndarray) -> Dict[str, float]:
        pil_gray = ImageOps.grayscale(Image.fromarray(image_bgr[:, :, ::-1]))
        brightness = float(np.asarray(pil_gray).mean())
        sharpness = float(np.asarray(pil_gray.filter(ImageFilter.FIND_EDGES)).mean())
        return {"brightness": brightness, "sharpness": sharpness}

    def _single_face_or_reason(self, image_bgr: np.ndarray) -> Dict[str, Any]:
        if not self._available or self._app is None:
            return {"status": "blocked", "message": "Servico facial backend indisponivel."}

        faces = self._app.get(image_bgr)
        if not faces:
            return {"status": "retry", "message": "Nenhum rosto detectado. Centralize o colaborador na camera."}
        if len(faces) > 1:
            return {"status": "blocked", "message": "Mais de um rosto detectado. Apenas um colaborador pode aparecer na imagem."}

        face = faces[0]
        det_score = float(getattr(face, "det_score", 0.0))
        if det_score < MIN_DETECTION_SCORE:
            return {"status": "retry", "message": "Rosto detectado com baixa confianca. Melhore a iluminacao."}

        bbox = np.asarray(face.bbox, dtype=np.float32)
        width = float(image_bgr.shape[1])
        height = float(image_bgr.shape[0])
        face_width = max(float(bbox[2] - bbox[0]), 1.0)
        face_height = max(float(bbox[3] - bbox[1]), 1.0)
        face_ratio = (face_width * face_height) / (width * height)

        center_x = (bbox[0] + bbox[2]) / 2.0
        center_y = (bbox[1] + bbox[3]) / 2.0
        offset_x = abs(center_x - (width / 2.0)) / width
        offset_y = abs(center_y - (height / 2.0)) / height

        if face_ratio < MIN_FACE_RATIO:
            return {"status": "retry", "message": "Rosto muito distante. Aproxime o celular ou o colaborador da camera."}
        if face_ratio > MAX_FACE_RATIO:
            return {"status": "retry", "message": "Rosto muito proximo. Afaste um pouco a camera."}
        if offset_x > MAX_CENTER_OFFSET or offset_y > MAX_CENTER_OFFSET:
            return {"status": "retry", "message": "Centralize o rosto do colaborador na imagem."}

        image_metrics = self._brightness_and_sharpness(image_bgr)
        if image_metrics["brightness"] < MIN_BRIGHTNESS:
            return {"status": "retry", "message": "Imagem escura. Melhore a iluminacao antes de continuar."}
        if image_metrics["sharpness"] < MIN_SHARPNESS:
            return {"status": "retry", "message": "Imagem com borrado. Mantenha a camera firme por um instante."}

        embedding = np.asarray(getattr(face, "embedding", None), dtype=np.float32)
        if embedding.size == 0:
            return {"status": "retry", "message": "Nao foi possivel gerar embedding facial. Tente novamente."}

        return {
            "status": "ok",
            "face": face,
            "embedding": embedding,
            "detection_score": det_score,
            "bbox": bbox.tolist(),
            **image_metrics,
        }

    def evaluate_image(self, image_base64: str) -> Dict[str, Any]:
        image_bgr = self.decode_base64_image(image_base64)
        return self._single_face_or_reason(image_bgr)

    def enroll_from_image(self, image_base64: str, pose_label: str = "frontal") -> Dict[str, Any]:
        image_bgr = self.decode_base64_image(image_base64)
        evaluation = self._single_face_or_reason(image_bgr)
        if evaluation["status"] != "ok":
            return evaluation

        quality_score = self._compute_quality_score(
            detection_score=evaluation["detection_score"],
            brightness=evaluation["brightness"],
            sharpness=evaluation["sharpness"],
        )
        return {
            "status": "ok",
            "embedding": evaluation["embedding"],
            "detection_score": evaluation["detection_score"],
            "quality_score": quality_score,
            "pose_label": pose_label,
            "message": "Biometria facial pronta para cadastro.",
        }

    def _compute_quality_score(self, detection_score: float, brightness: float, sharpness: float) -> float:
        brightness_score = float(np.clip(brightness / 120.0, 0.0, 1.0))
        sharpness_score = float(np.clip(sharpness / 40.0, 0.0, 1.0))
        return round((detection_score * 0.5) + (brightness_score * 0.2) + (sharpness_score * 0.3), 4)

    def identify_fast(self, image_base64: str) -> Dict[str, Any]:
        evaluation = self.evaluate_image(image_base64)
        if evaluation["status"] != "ok":
            return {
                "status": evaluation["status"],
                "message": evaluation["message"],
                "employee_id": None,
                "employee_name": None,
                "similarity_score": 0.0,
                "detection_confidence": float(evaluation.get("detection_score") or 0.0),
                "liveness_required": False,
            }

        if not self._flat_embeddings:
            return {
                "status": "blocked",
                "message": "Nenhuma biometria facial cadastrada na base.",
                "employee_id": None,
                "employee_name": None,
                "similarity_score": 0.0,
                "detection_confidence": evaluation["detection_score"],
                "liveness_required": False,
            }

        probe = evaluation["embedding"]
        best_record = None
        best_similarity = -1.0

        for record in self._flat_embeddings:
            similarity = self._cosine_similarity(probe, record.descriptor)
            if similarity > best_similarity:
                best_similarity = similarity
                best_record = record

        if best_record is None:
            return {
                "status": "blocked",
                "message": "Nenhum colaborador identificado.",
                "employee_id": None,
                "employee_name": None,
                "similarity_score": 0.0,
                "detection_confidence": evaluation["detection_score"],
                "liveness_required": False,
            }

        if best_similarity >= SIMILARITY_AUTO_APPROVE:
            status = "approved"
            message = f"{best_record.employee_name} identificado com alta confianca."
            liveness_required = False
        elif best_similarity >= SIMILARITY_RETRY_MIN:
            status = "retry"
            message = "Confianca media. Realize uma segunda captura automatica ou validacao de movimento."
            liveness_required = True
        else:
            status = "blocked"
            message = "Similaridade abaixo do limite de seguranca. Nova tentativa obrigatoria."
            liveness_required = False

        return {
            "status": status,
            "message": message,
            "employee_id": best_record.employee_id if status != "blocked" else None,
            "employee_name": best_record.employee_name if status != "blocked" else None,
            "similarity_score": round(float(best_similarity), 4),
            "detection_confidence": round(float(evaluation["detection_score"]), 4),
            "liveness_required": liveness_required,
            "matched_pose_label": best_record.pose_label,
        }

    def _cosine_similarity(self, probe: np.ndarray, gallery: np.ndarray) -> float:
        if probe.shape != gallery.shape:
            return 0.0
        probe_norm = np.linalg.norm(probe)
        gallery_norm = np.linalg.norm(gallery)
        if probe_norm == 0 or gallery_norm == 0:
            return 0.0
        similarity = float(np.dot(probe, gallery) / (probe_norm * gallery_norm))
        return max(0.0, min(1.0, similarity))

    def liveness_check(self, image_base64: str, previous_image_base64: Optional[str] = None) -> Dict[str, Any]:
        current_eval = self.evaluate_image(image_base64)
        if current_eval["status"] != "ok":
            return {
                "status": "retry",
                "message": current_eval["message"],
                "passed": False,
            }

        if not previous_image_base64:
            return {
                "status": "retry",
                "message": "Envie uma segunda captura para validar movimento ou piscada.",
                "passed": False,
            }

        previous_eval = self.evaluate_image(previous_image_base64)
        if previous_eval["status"] != "ok":
            return {
                "status": "retry",
                "message": "A segunda captura nao ficou valida. Tente novamente com leve movimento.",
                "passed": False,
            }

        current_bbox = np.asarray(current_eval["bbox"], dtype=np.float32)
        previous_bbox = np.asarray(previous_eval["bbox"], dtype=np.float32)
        delta = np.abs(current_bbox - previous_bbox).mean()
        passed = delta > 4.5

        return {
            "status": "approved" if passed else "retry",
            "message": "Movimento facial validado." if passed else "Movimento insuficiente. Pisque ou mova levemente o rosto.",
            "passed": passed,
            "movement_delta": round(float(delta), 4),
        }
