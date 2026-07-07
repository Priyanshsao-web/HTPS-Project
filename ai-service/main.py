"""
HTPS Korba AI Service — FastAPI
Provides ML predictions, DPR parsing, and AI insights.
"""
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
import logging

from models.predictor import HTPSPredictor
from parsers.dpr_parser import parse_csv, parse_excel, parse_pdf, normalize_parsed_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="HTPS Korba AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)

predictor = HTPSPredictor()

@app.on_event("startup")
async def startup():
    logger.info("Loading ML models...")
    try:
        predictor.load()
        logger.info("Models loaded successfully")
    except Exception as e:
        logger.warning(f"Could not load models, will train on first request: {e}")


class PredictionInput(BaseModel):
    coal_consumption: float = 7500
    coal_gcv: float = 3800
    steam_pressure: float = 160
    steam_temperature: float = 540
    dm_water: float = 120
    oil_consumption: float = 0.5
    auxiliary_consumption: float = 11
    load: float = 1600
    model: Optional[str] = "xgboost"


class TrainRequest(BaseModel):
    retrain: bool = False


@app.get("/")
def health():
    return {"status": "ok", "service": "HTPS AI Service", "models": list(predictor.models.keys())}


@app.get("/health")
def health_check():
    return {"status": "healthy", "models_loaded": len(predictor.models) > 0}


@app.post("/predict")
def predict(input_data: PredictionInput):
    try:
        features = input_data.model_dump(exclude={"model"})
        result = predictor.predict(features, input_data.model or "xgboost")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/all")
def predict_all_models(input_data: PredictionInput):
    try:
        features = input_data.model_dump(exclude={"model"})
        results = predictor.predict_all(features)
        return {"predictions": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/train")
def train_models(req: TrainRequest):
    try:
        metrics = predictor.train()
        return {"status": "success", "metrics": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/metrics")
def get_model_metrics():
    return {"models": predictor.get_metrics()}


@app.post("/parse/csv")
async def parse_csv_file(file: UploadFile = File(...)):
    content = await file.read()
    parsed = parse_csv(content.decode("utf-8", errors="ignore"))
    normalized = normalize_parsed_data(parsed)
    return {"parsed": parsed, "normalized": normalized, "filename": file.filename}


@app.post("/parse/excel")
async def parse_excel_file(file: UploadFile = File(...)):
    content = await file.read()
    parsed = parse_excel(content)
    normalized = normalize_parsed_data(parsed)
    return {"parsed": parsed, "normalized": normalized, "filename": file.filename}


@app.post("/parse/pdf")
async def parse_pdf_file(file: UploadFile = File(...)):
    content = await file.read()
    parsed = parse_pdf(content)
    normalized = normalize_parsed_data(parsed)
    return {"parsed": parsed, "normalized": normalized, "filename": file.filename}


@app.post("/parse/auto")
async def parse_auto(file: UploadFile = File(...)):
    ext = (file.filename or "").split(".")[-1].lower()
    content = await file.read()
    if ext == "csv":
        parsed = parse_csv(content.decode("utf-8", errors="ignore"))
    elif ext in ("xlsx", "xls"):
        parsed = parse_excel(content)
    elif ext == "pdf":
        parsed = parse_pdf(content)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
    normalized = normalize_parsed_data(parsed)
    return {"parsed": parsed, "normalized": normalized, "file_type": ext}


@app.post("/insights")
def generate_insights(data: dict):
    """Generate AI insights from plant data."""
    insights = []
    gen = data.get("generation", {})
    fuel = data.get("fuel", {})
    efficiency = data.get("efficiency", {})

    plf = gen.get("plf", 0)
    if plf < 60:
        insights.append({
            "type": "generation",
            "severity": "critical" if plf < 50 else "warning",
            "title": f"Low PLF: {plf:.1f}%",
            "description": f"Plant Load Factor at {plf:.1f}% is below acceptable threshold of 60%.",
            "recommendations": ["Check unit availability", "Review dispatch schedule", "Inspect for forced outages"],
        })

    gcv = fuel.get("coal_gcv", 0)
    if gcv and gcv < 3400:
        insights.append({
            "type": "fuel",
            "severity": "warning",
            "title": f"Low Coal GCV: {gcv:.0f} kcal/kg",
            "description": f"Coal GCV of {gcv:.0f} kcal/kg is below design value of 3800 kcal/kg.",
            "recommendations": ["Review coal procurement", "Increase mill loading", "Monitor specific consumption"],
        })

    hr = efficiency.get("gross_heat_rate", 0)
    if hr and hr > 2450:
        insights.append({
            "type": "efficiency",
            "severity": "critical" if hr > 2550 else "warning",
            "title": f"High Heat Rate: {hr:.0f} kcal/kWh",
            "description": f"Gross heat rate {hr:.0f} kcal/kWh exceeds design value of 2350 kcal/kWh.",
            "recommendations": ["Inspect condenser vacuum", "Check turbine blade condition", "Review boiler performance"],
        })

    if not insights:
        insights.append({
            "type": "general",
            "severity": "info",
            "title": "Plant operating normally",
            "description": "All key parameters within acceptable limits.",
            "recommendations": ["Continue current O&M practices"],
        })

    return {"insights": insights}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
