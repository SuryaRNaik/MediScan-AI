from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Union

class PatientInfo(BaseModel):
    name: Optional[str] = None
    age: Optional[str] = None
    gender: Optional[str] = None
    patient_id: Optional[str] = None
    doctor_name: Optional[str] = None
    report_date: Optional[str] = None

class GynoPatientInfo(PatientInfo):
    gestational_age: Optional[str] = None
    expected_delivery_date_edd: Optional[str] = None
    gravida_para: Optional[str] = None

class Biomarker(BaseModel):
    name: str
    value: Union[float, str]
    unit: str
    reference_range: str
    status: str  # Normal, High, Low
    interpretation: str

class DiseaseExplanation(BaseModel):
    disease_name: str
    simple_explanation: str
    # Richer fields returned by the new eye/ecg prompts (optional for backward compat)
    severity: Optional[str] = None
    status: Optional[str] = None
    treatment: Optional[str] = None
    urgency: Optional[str] = None

class EyeMetric(BaseModel):
    metric: str
    value: Union[float, str]
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    status: Optional[str] = None  # Normal, High, Low

class EcgMetric(BaseModel):
    metric: str
    value: Union[float, str]
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    status: Optional[str] = None  # Normal, High, Low

class GynoMetric(BaseModel):
    metric: str
    value: Union[float, str]
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    status: Optional[str] = None  # Normal, High, Low

# ── Base Schema for all reports ────────────────────────────────────────────────
class BaseMedicalReport(BaseModel):
    report_type: str
    patient_info: Optional[PatientInfo] = None
    health_score: int
    summary: str
    recommendations: List[str]
    disease_explanations: List[DiseaseExplanation] = Field(default_factory=list)

# ── Specific Report Schemas ────────────────────────────────────────────────────
class BloodReportSchema(BaseMedicalReport):
    report_type: Literal["blood_test"] = "blood_test"
    biomarkers: List[Biomarker]

class EyePrescription(BaseModel):
    sph_right: Optional[str] = None
    cyl_right: Optional[str] = None
    axis_right: Optional[str] = None
    sph_left: Optional[str] = None
    cyl_left: Optional[str] = None
    axis_left: Optional[str] = None

class FollowUpItem(BaseModel):
    condition: str
    timeline: str

class AnatomyIssue(BaseModel):
    region: str
    color: str

class EyeReportSchema(BaseMedicalReport):
    report_type: Literal["eye_report"] = "eye_report"
    visual_acuity_left: Optional[str] = None
    visual_acuity_right: Optional[str] = None
    intraocular_pressure: Optional[str] = None
    corneal_thickness: Optional[str] = None
    tear_film_breakup_time: Optional[str] = None
    cup_to_disc_ratio: Optional[str] = None
    prescription: Optional[EyePrescription] = None
    vision_summary: List[str] = Field(default_factory=list)
    follow_up_timeline: List[FollowUpItem] = Field(default_factory=list)
    anatomy_issues: List[AnatomyIssue] = Field(default_factory=list)
    findings: List[str] = Field(default_factory=list)
    eye_metrics: Optional[List[EyeMetric]] = Field(default_factory=list)

class ECGReportSchema(BaseMedicalReport):
    report_type: Literal["ecg_heart"] = "ecg_heart"
    heart_rate: Optional[int] = None
    rhythm_type: Optional[str] = None
    pr_interval: Optional[str] = None
    qtc_interval: Optional[str] = None
    abnormalities: List[str] = Field(default_factory=list)
    ecg_metrics: Optional[List[EcgMetric]] = Field(default_factory=list)
    simple_summary: Optional[str] = None

class GynoReportSchema(BaseMedicalReport):
    report_type: Literal["gyno_report"] = "gyno_report"
    patient_info: Optional[GynoPatientInfo] = None
    fetal_heart_rate: Optional[str] = None
    gyno_subtype: Optional[str] = None
    findings: List[str] = Field(default_factory=list)
    gyno_metrics: Optional[List[GynoMetric]] = Field(default_factory=list)
    follow_up_timeline: List[FollowUpItem] = Field(default_factory=list)

# ── Dynamic Union ──────────────────────────────────────────────────────────────
MedicalAnalysis = Union[BloodReportSchema, EyeReportSchema, ECGReportSchema, GynoReportSchema]