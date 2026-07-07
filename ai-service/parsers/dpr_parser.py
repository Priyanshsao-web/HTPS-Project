import re
import io
from typing import Optional
import pandas as pd
import pdfplumber


FIELD_ALIASES = {
    "total_generation": ["total generation", "daily generation", "generation (mu)", "generation mu", "total gen", "net generation"],
    "plf": ["plf", "plant load factor", "load factor"],
    "average_load": ["average load", "avg load", "mean load", "average mw"],
    "coal_consumption": ["coal consumption", "coal consumed", "coal cons", "total coal"],
    "specific_coal_consumption": ["specific coal consumption", "scc", "sp coal", "specific coal"],
    "coal_gcv": ["coal gcv", "gcv of coal", "gcv", "calorific value"],
    "hsd_consumption": ["hsd consumption", "hsd cons", "hsd consumed"],
    "total_oil_consumption": ["oil consumption", "total oil", "oil cons", "total hsd"],
    "dm_water_consumption": ["dm water", "dm water consumption", "dm makeup quantity", "demineralised water"],
    "dm_water_makeup_pct": ["dm makeup %", "dm makeup percent", "dm water %"],
    "gross_heat_rate": ["gross heat rate", "ghr", "heat rate (kcal/kwh)", "heat rate"],
    "net_heat_rate": ["net heat rate", "nhr"],
    "auxiliary_consumption": ["auxiliary consumption", "aux consumption", "auxiliary power"],
    "auxiliary_power_pct": ["auxiliary %", "aux %", "auxiliary power %", "aux power %"],
    "boiler_efficiency": ["boiler efficiency", "boiler eff", "η boiler"],
    "turbine_efficiency": ["turbine efficiency", "turbine eff", "η turbine"],
    "plant_efficiency": ["plant efficiency", "overall efficiency", "thermal efficiency"],
    "boiler_pressure": ["boiler pressure", "main steam pressure", "ms pressure"],
    "steam_temperature": ["steam temperature", "ms temperature", "main steam temp"],
    "reheater_temperature": ["reheater temperature", "rh temperature", "rh temp"],
    "feed_water_temperature": ["feed water temperature", "fw temperature"],
    "o2_percentage": ["o2 %", "o2 percent", "oxygen %", "flue gas o2"],
    "flue_gas_temperature": ["flue gas temperature", "fgt", "fg temp", "economiser outlet"],
    "condenser_pressure": ["condenser pressure", "condenser back pressure"],
    "vacuum": ["vacuum", "condenser vacuum"],
}


def _to_float(val) -> Optional[float]:
    if val is None:
        return None
    try:
        return float(str(val).replace(",", "").strip())
    except (ValueError, TypeError):
        return None


def _match_field(text: str) -> Optional[str]:
    lower = text.lower().strip()
    for field, aliases in FIELD_ALIASES.items():
        if any(alias in lower for alias in aliases):
            return field
    return None


def parse_csv(content: str) -> dict:
    try:
        df = pd.read_csv(io.StringIO(content))
        df.columns = [c.lower().strip() for c in df.columns]
        result = {"report_date": None}
        for col in df.columns:
            field = _match_field(col)
            if field and not df[col].empty:
                val = _to_float(df[col].iloc[0])
                if val is not None:
                    result[field] = val
        # Try date column
        for col in df.columns:
            if "date" in col and not df[col].empty:
                result["report_date"] = str(df[col].iloc[0])
                break
        return result
    except Exception as e:
        return {"error": str(e)}


def parse_excel(file_bytes: bytes) -> dict:
    try:
        df = pd.read_excel(io.BytesIO(file_bytes), header=None)
        result = {"report_date": None}

        # Scan for key-value pairs (label in col A or B, value in next col)
        for _, row in df.iterrows():
            row_vals = [str(v).strip() if v is not None else "" for v in row]
            for i, cell in enumerate(row_vals[:-1]):
                if not cell:
                    continue
                if "date" in cell.lower():
                    result["report_date"] = row_vals[i + 1] if i + 1 < len(row_vals) else None
                field = _match_field(cell)
                if field and i + 1 < len(row_vals):
                    val = _to_float(row_vals[i + 1])
                    if val is not None:
                        result[field] = val

        # Also try treating first row as headers
        try:
            df_header = pd.read_excel(io.BytesIO(file_bytes))
            df_header.columns = [c.lower().strip() for c in df_header.columns]
            for col in df_header.columns:
                field = _match_field(col)
                if field and field not in result:
                    val = _to_float(df_header[col].iloc[0])
                    if val is not None:
                        result[field] = val
        except Exception:
            pass

        return result
    except Exception as e:
        return {"error": str(e)}


def parse_pdf(file_bytes: bytes) -> dict:
    try:
        result = {"report_date": None, "raw_text": ""}
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            text = "\n".join(page.extract_text() or "" for page in pdf.pages)
            result["raw_text"] = text[:2000]

            # Extract date
            date_patterns = [
                r"date[:\s]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
                r"(\d{4}-\d{2}-\d{2})",
                r"(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})",
            ]
            for pat in date_patterns:
                m = re.search(pat, text, re.IGNORECASE)
                if m:
                    result["report_date"] = m.group(1)
                    break

            # Extract key-value pairs from text lines
            lines = text.split("\n")
            for line in lines:
                if ":" in line:
                    parts = line.split(":", 1)
                    field = _match_field(parts[0])
                    if field:
                        nums = re.findall(r"[\d,]+\.?\d*", parts[1])
                        if nums:
                            val = _to_float(nums[0])
                            if val is not None:
                                result[field] = val

        return result
    except Exception as e:
        return {"error": str(e)}


def normalize_parsed_data(parsed: dict) -> dict:
    """Convert parsed data to standard DPR format for DB insertion."""
    from datetime import date
    report_date = parsed.get("report_date") or str(date.today())

    return {
        "report_date": report_date,
        "generation": {
            "report_date": report_date,
            "total_generation": parsed.get("total_generation", 0),
            "plf": parsed.get("plf", 0),
            "average_load": parsed.get("average_load", 0),
        },
        "fuel": {
            "report_date": report_date,
            "coal_consumption": parsed.get("coal_consumption", 0),
            "specific_coal_consumption": parsed.get("specific_coal_consumption", 0),
            "coal_gcv": parsed.get("coal_gcv", 0),
            "hsd_consumption": parsed.get("hsd_consumption", 0),
            "total_oil_consumption": parsed.get("total_oil_consumption", 0),
        },
        "water": {
            "report_date": report_date,
            "dm_water_consumption": parsed.get("dm_water_consumption", 0),
            "dm_water_makeup_pct": parsed.get("dm_water_makeup_pct", 0),
        },
        "efficiency": {
            "report_date": report_date,
            "gross_heat_rate": parsed.get("gross_heat_rate", 0),
            "net_heat_rate": parsed.get("net_heat_rate", 0),
            "auxiliary_consumption": parsed.get("auxiliary_consumption", 0),
            "auxiliary_power_pct": parsed.get("auxiliary_power_pct", 0),
            "boiler_efficiency": parsed.get("boiler_efficiency", 0),
            "turbine_efficiency": parsed.get("turbine_efficiency", 0),
            "plant_efficiency": parsed.get("plant_efficiency", 0),
        },
        "boiler": {
            "report_date": report_date,
            "boiler_pressure": parsed.get("boiler_pressure", 0),
            "steam_temperature": parsed.get("steam_temperature", 0),
            "reheater_temperature": parsed.get("reheater_temperature", 0),
            "feed_water_temperature": parsed.get("feed_water_temperature", 0),
            "o2_percentage": parsed.get("o2_percentage", 0),
            "flue_gas_temperature": parsed.get("flue_gas_temperature", 0),
        },
    }
