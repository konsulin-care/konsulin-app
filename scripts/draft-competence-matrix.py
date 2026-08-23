#!/usr/bin/env python3
"""Draft the classification-level competence matrix.

Drafts every (grouping, classification) pair from the cached NUCC taxonomy to
the ICF domain paths the classification can competently serve. The draft is
evidence-based: ISCO-08 profession layer + NUCC scope-statement patterns,
then hand-reviewed. Output: internal/data/specialty/config/specialty-competence.json.

Usage: python3 scripts/draft-competence-matrix.py
"""
import csv
import json
import os
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
CACHE = os.path.join(ROOT, "internal", "data", "specialty", ".cache", "nucc-taxonomy.csv")
OUT = os.path.join(ROOT, "internal", "data", "specialty", "config", "specialty-competence.json")

PHYSICAL = "physical-health"
MENTAL = "mental-emotional-health"
SOCIAL = "social-health-relationships"
FUNCTIONAL = "functional-capacity"
MEANING = "meaning-purpose-fulfilment"
LIFESTYLE = "health-behaviours-lifestyle"
ENVIRONMENTAL = "environmental-contextual"

# (grouping, classification) -> competence paths. Curation follows scope of
# care: physician classes serve the body systems they treat; behavioral
# classes serve psychological/social/functional domains; therapists and
# technicians serve the systems they exercise. "general" marks domain-wide
# competence; leaf paths mark concrete subdomain competence.
CURATED = {
    # ---- Allopathic & Osteopathic Physicians ----
    ("Allopathic & Osteopathic Physicians", "Allergy & Immunology"):
        [f"{PHYSICAL}.cardio-respiratory", f"{PHYSICAL}.dermatologic"],
    ("Allopathic & Osteopathic Physicians", "Anesthesiology"):
        [f"{PHYSICAL}.cardio-respiratory", f"{PHYSICAL}.general"],
    ("Allopathic & Osteopathic Physicians", "Clinical Pharmacology"):
        [f"{PHYSICAL}.general", f"{LIFESTYLE}.substance-use"],
    ("Allopathic & Osteopathic Physicians", "Colon & Rectal Surgery"):
        [f"{PHYSICAL}.digestive"],
    ("Allopathic & Osteopathic Physicians", "Dermatology"):
        [f"{PHYSICAL}.dermatologic"],
    ("Allopathic & Osteopathic Physicians", "Electrodiagnostic Medicine"):
        [f"{PHYSICAL}.neurological"],
    ("Allopathic & Osteopathic Physicians", "Emergency Medicine"):
        [f"{PHYSICAL}.general"],
    ("Allopathic & Osteopathic Physicians", "Family Medicine"):
        [f"{PHYSICAL}.general"],
    ("Allopathic & Osteopathic Physicians", "General Practice"):
        [f"{PHYSICAL}.general"],
    ("Allopathic & Osteopathic Physicians", "Hospitalist"):
        [f"{PHYSICAL}.general"],
    ("Allopathic & Osteopathic Physicians", "Independent Medical Examiner"):
        [f"{FUNCTIONAL}.work-capacity", f"{PHYSICAL}.general"],
    ("Allopathic & Osteopathic Physicians", "Integrative Medicine"):
        [f"{PHYSICAL}.general", f"{LIFESTYLE}.general"],
    ("Allopathic & Osteopathic Physicians", "Internal Medicine"):
        [f"{PHYSICAL}.general"],
    ("Allopathic & Osteopathic Physicians", "Legal Medicine"):
        [f"{PHYSICAL}.general"],
    ("Allopathic & Osteopathic Physicians", "Medical Genetics"):
        [f"{PHYSICAL}.general"],
    ("Allopathic & Osteopathic Physicians", "Neurological Surgery"):
        [f"{PHYSICAL}.neurological"],
    ("Allopathic & Osteopathic Physicians", "Neuromusculoskeletal Medicine & OMM"):
        [f"{PHYSICAL}.musculoskeletal"],
    ("Allopathic & Osteopathic Physicians", "Neuromusculoskeletal Medicine, Sports Medicine"):
        [f"{PHYSICAL}.musculoskeletal"],
    ("Allopathic & Osteopathic Physicians", "Nuclear Medicine"):
        [f"{PHYSICAL}.general"],
    ("Allopathic & Osteopathic Physicians", "Obstetrics & Gynecology"):
        [f"{PHYSICAL}.general"],
    ("Allopathic & Osteopathic Physicians", "Ophthalmology"):
        [f"{PHYSICAL}.sensory"],
    ("Allopathic & Osteopathic Physicians", "Oral & Maxillofacial Surgery"):
        [f"{PHYSICAL}.musculoskeletal", f"{PHYSICAL}.general"],
    ("Allopathic & Osteopathic Physicians", "Orthopaedic Surgery"):
        [f"{PHYSICAL}.musculoskeletal", f"{ENVIRONMENTAL}.ergonomics"],
    ("Allopathic & Osteopathic Physicians", "Otolaryngology"):
        [f"{PHYSICAL}.sensory", f"{PHYSICAL}.cardio-respiratory"],
    ("Allopathic & Osteopathic Physicians", "Pain Medicine"):
        [f"{PHYSICAL}.musculoskeletal", f"{PHYSICAL}.neurological"],
    ("Allopathic & Osteopathic Physicians", "Pathology"):
        [f"{PHYSICAL}.general"],
    ("Allopathic & Osteopathic Physicians", "Pediatrics"):
        [f"{PHYSICAL}.general"],
    ("Allopathic & Osteopathic Physicians", "Phlebology"):
        [f"{PHYSICAL}.cardio-respiratory", f"{PHYSICAL}.general"],
    ("Allopathic & Osteopathic Physicians", "Physical Medicine & Rehabilitation"):
        [f"{FUNCTIONAL}.mobility", f"{FUNCTIONAL}.daily-living", f"{PHYSICAL}.musculoskeletal"],
    ("Allopathic & Osteopathic Physicians", "Plastic Surgery"):
        [f"{PHYSICAL}.dermatologic", f"{PHYSICAL}.general"],
    ("Allopathic & Osteopathic Physicians", "Preventive Medicine"):
        [f"{PHYSICAL}.general", f"{LIFESTYLE}.general"],
    ("Allopathic & Osteopathic Physicians", "Psychiatry & Neurology"):
        [f"{MENTAL}.mood-disorders", f"{MENTAL}.anxiety-stress",
         f"{MENTAL}.trauma-grief", f"{MENTAL}.cognitive-behavioral",
         f"{MENTAL}.addiction", f"{MENTAL}.psychosis", f"{MENTAL}.general",
         f"{PHYSICAL}.neurological", f"{LIFESTYLE}.substance-use"],
    ("Allopathic & Osteopathic Physicians", "Radiology"):
        [f"{PHYSICAL}.general"],
    ("Allopathic & Osteopathic Physicians", "Surgery"):
        [f"{PHYSICAL}.general"],
    ("Allopathic & Osteopathic Physicians", "Thoracic Surgery (Cardiothoracic Vascular Surgery)"):
        [f"{PHYSICAL}.cardio-respiratory"],
    ("Allopathic & Osteopathic Physicians", "Transplant Surgery"):
        [f"{PHYSICAL}.general"],
    ("Allopathic & Osteopathic Physicians", "Urology"):
        [f"{PHYSICAL}.general"],
    # ---- Behavioral Health & Social Service Providers ----
    ("Behavioral Health & Social Service Providers", "Assistant Behavior Analyst"):
        [f"{MENTAL}.cognitive-behavioral"],
    ("Behavioral Health & Social Service Providers", "Behavior Analyst"):
        [f"{MENTAL}.cognitive-behavioral"],
    ("Behavioral Health & Social Service Providers", "Behavior Technician"):
        [f"{MENTAL}.cognitive-behavioral"],
    ("Behavioral Health & Social Service Providers", "Clinical Neuropsychologist"):
        [f"{FUNCTIONAL}.attention-cognition", f"{FUNCTIONAL}.memory",
         f"{MENTAL}.cognitive-behavioral", f"{PHYSICAL}.neurological"],
    ("Behavioral Health & Social Service Providers", "Counselor"):
        [f"{MENTAL}.cognitive-behavioral", f"{MENTAL}.anxiety-stress",
         f"{MENTAL}.trauma-grief", f"{SOCIAL}.couple-family",
         f"{SOCIAL}.work-relations", f"{SOCIAL}.communication",
         f"{SOCIAL}.loneliness", f"{MEANING}.self-esteem",
         f"{MEANING}.life-transitions"],
    ("Behavioral Health & Social Service Providers", "Drama Therapist"):
        [f"{MENTAL}.trauma-grief", f"{MENTAL}.cognitive-behavioral"],
    ("Behavioral Health & Social Service Providers", "Marriage & Family Therapist"):
        [f"{SOCIAL}.couple-family", f"{MENTAL}.cognitive-behavioral"],
    ("Behavioral Health & Social Service Providers", "Poetry Therapist"):
        [f"{MENTAL}.cognitive-behavioral", f"{MENTAL}.trauma-grief"],
    ("Behavioral Health & Social Service Providers", "Psychoanalyst"):
        [f"{MENTAL}.mood-disorders", f"{MENTAL}.cognitive-behavioral",
         f"{MENTAL}.anxiety-stress"],
    ("Behavioral Health & Social Service Providers", "Psychologist"):
        [f"{MENTAL}.mood-disorders", f"{MENTAL}.anxiety-stress",
         f"{MENTAL}.trauma-grief", f"{MENTAL}.cognitive-behavioral",
         f"{MENTAL}.psychosis", f"{MENTAL}.addiction", f"{MENTAL}.general",
         f"{LIFESTYLE}.substance-use",
         f"{MEANING}.career", f"{MEANING}.existential",
         f"{MEANING}.life-transitions", f"{MEANING}.self-esteem",
         f"{SOCIAL}.couple-family", f"{SOCIAL}.communication",
         f"{SOCIAL}.loneliness", f"{SOCIAL}.general"],
    ("Behavioral Health & Social Service Providers", "Social Worker"):
        [f"{SOCIAL}.general", f"{MENTAL}.cognitive-behavioral",
         f"{ENVIRONMENTAL}.caregiving", f"{ENVIRONMENTAL}.financial",
         f"{MEANING}.life-transitions"],
    # ---- Chiropractic Providers ----
    ("Chiropractic Providers", "Chiropractor"):
        [f"{PHYSICAL}.musculoskeletal", f"{ENVIRONMENTAL}.ergonomics"],
    # ---- Dental Providers ----
    ("Dental Providers", "Advanced Practice Dental Therapist"):
        [f"{PHYSICAL}.general"],
    ("Dental Providers", "Dental Assistant"):
        [f"{PHYSICAL}.general"],
    ("Dental Providers", "Dental Hygienist"):
        [f"{PHYSICAL}.general", f"{LIFESTYLE}.general"],
    ("Dental Providers", "Dental Laboratory Technician"):
        [f"{PHYSICAL}.general"],
    ("Dental Providers", "Dental Therapist"):
        [f"{PHYSICAL}.general"],
    ("Dental Providers", "Dentist"):
        [f"{PHYSICAL}.general"],
    ("Dental Providers", "Denturist"):
        [f"{PHYSICAL}.general"],
    # ---- Dietary & Nutritional Service Providers ----
    ("Dietary & Nutritional Service Providers", "Dietary Manager"):
        [f"{LIFESTYLE}.eating-weight"],
    ("Dietary & Nutritional Service Providers", "Dietetic Technician, Registered"):
        [f"{LIFESTYLE}.eating-weight"],
    ("Dietary & Nutritional Service Providers", "Dietitian, Registered"):
        [f"{LIFESTYLE}.eating-weight"],
    ("Dietary & Nutritional Service Providers", "Nutritionist"):
        [f"{LIFESTYLE}.eating-weight"],
    # ---- Emergency Medical Service Providers ----
    ("Emergency Medical Service Providers", "Community Paramedic"):
        [f"{PHYSICAL}.general"],
    ("Emergency Medical Service Providers", "Emergency Medical Technician, Basic"):
        [f"{PHYSICAL}.general"],
    ("Emergency Medical Service Providers", "Emergency Medical Technician, Intermediate"):
        [f"{PHYSICAL}.general"],
    ("Emergency Medical Service Providers", "Emergency Medical Technician, Paramedic"):
        [f"{PHYSICAL}.general"],
    ("Emergency Medical Service Providers", "Personal Emergency Response Attendant"):
        [f"{PHYSICAL}.general"],
    # ---- Eye and Vision Services Providers ----
    ("Eye and Vision Services Providers", "Optometrist"):
        [f"{PHYSICAL}.sensory"],
    ("Eye and Vision Services Providers", "Technician/Technologist"):
        [f"{PHYSICAL}.sensory"],
    # ---- Group ----
    ("Group", "Multi-Specialty"):
        [f"{PHYSICAL}.general", f"{MENTAL}.general", f"{SOCIAL}.general",
         f"{FUNCTIONAL}.general", f"{MEANING}.general",
         f"{LIFESTYLE}.general", f"{ENVIRONMENTAL}.general"],
    ("Group", "Single Specialty"):
        [f"{PHYSICAL}.general", f"{MENTAL}.general", f"{SOCIAL}.general",
         f"{FUNCTIONAL}.general", f"{MEANING}.general",
         f"{LIFESTYLE}.general", f"{ENVIRONMENTAL}.general"],
    # ---- Nursing Service Providers ----
    ("Nursing Service Providers", "Licensed Practical Nurse"):
        [f"{PHYSICAL}.general", f"{FUNCTIONAL}.daily-living"],
    ("Nursing Service Providers", "Licensed Psychiatric Technician"):
        [f"{MENTAL}.general"],
    ("Nursing Service Providers", "Licensed Vocational Nurse"):
        [f"{PHYSICAL}.general", f"{FUNCTIONAL}.daily-living"],
    ("Nursing Service Providers", "Registered Nurse"):
        [f"{PHYSICAL}.general", f"{FUNCTIONAL}.daily-living"],
    # ---- Nursing Service Related Providers ----
    ("Nursing Service Related Providers", "Adult Companion"):
        [f"{SOCIAL}.loneliness", f"{ENVIRONMENTAL}.caregiving"],
    ("Nursing Service Related Providers", "Chore Provider"):
        [f"{ENVIRONMENTAL}.caregiving", f"{FUNCTIONAL}.daily-living"],
    ("Nursing Service Related Providers", "Day Training/Habilitation Specialist"):
        [f"{FUNCTIONAL}.daily-living", f"{FUNCTIONAL}.work-capacity"],
    ("Nursing Service Related Providers", "Doula"):
        [f"{ENVIRONMENTAL}.caregiving"],
    ("Nursing Service Related Providers", "Home Health Aide"):
        [f"{ENVIRONMENTAL}.caregiving", f"{FUNCTIONAL}.daily-living"],
    ("Nursing Service Related Providers", "Homemaker"):
        [f"{FUNCTIONAL}.daily-living"],
    ("Nursing Service Related Providers", "Nurse's Aide"):
        [f"{FUNCTIONAL}.daily-living"],
    ("Nursing Service Related Providers", "Nursing Home Administrator"):
        [f"{ENVIRONMENTAL}.caregiving"],
    ("Nursing Service Related Providers", "Religious Nonmedical Nursing Personnel"):
        [f"{MEANING}.existential", f"{ENVIRONMENTAL}.caregiving"],
    ("Nursing Service Related Providers", "Religious Nonmedical Practitioner"):
        [f"{MEANING}.existential"],
    ("Nursing Service Related Providers", "Technician"):
        [f"{PHYSICAL}.general", f"{FUNCTIONAL}.daily-living"],
    # ---- Other Service Providers ----
    ("Other Service Providers", "Acupuncturist"):
        [f"{PHYSICAL}.musculoskeletal"],
    ("Other Service Providers", "Case Manager/Care Coordinator"):
        [f"{SOCIAL}.general", f"{FUNCTIONAL}.general",
         f"{ENVIRONMENTAL}.caregiving"],
    ("Other Service Providers", "Clinical Ethicist"):
        [f"{MEANING}.existential", f"{SOCIAL}.general"],
    ("Other Service Providers", "Community Health Worker"):
        [f"{LIFESTYLE}.general", f"{SOCIAL}.general"],
    ("Other Service Providers", "Contractor"):
        [f"{PHYSICAL}.musculoskeletal"],
    ("Other Service Providers", "Driver"):
        [f"{FUNCTIONAL}.daily-living", f"{ENVIRONMENTAL}.general"],
    ("Other Service Providers", "Funeral Director"):
        [f"{ENVIRONMENTAL}.general", f"{MEANING}.existential"],
    ("Other Service Providers", "Genetic Counselor, MS"):
        [f"{PHYSICAL}.general"],
    ("Other Service Providers", "Health & Wellness Coach"):
        [f"{LIFESTYLE}.physical-activity", f"{LIFESTYLE}.eating-weight",
         f"{LIFESTYLE}.general"],
    ("Other Service Providers", "Health Educator"):
        [f"{LIFESTYLE}.general"],
    ("Other Service Providers", "Homeopath"):
        [f"{PHYSICAL}.general"],
    ("Other Service Providers", "Interpreter"):
        [f"{SOCIAL}.communication"],
    ("Other Service Providers", "Lactation Consultant, Non-RN"):
        [f"{LIFESTYLE}.eating-weight", f"{ENVIRONMENTAL}.caregiving"],
    ("Other Service Providers", "Legal Medicine"):
        [f"{PHYSICAL}.general"],
    ("Other Service Providers", "Mechanotherapist"):
        [f"{PHYSICAL}.musculoskeletal"],
    ("Other Service Providers", "Medical Genetics, Ph.D. Medical Genetics"):
        [f"{PHYSICAL}.general"],
    ("Other Service Providers", "Midwife"):
        [f"{ENVIRONMENTAL}.caregiving", f"{PHYSICAL}.general"],
    ("Other Service Providers", "Midwife, Lay"):
        [f"{ENVIRONMENTAL}.caregiving"],
    ("Other Service Providers", "Military Health Care Provider"):
        [f"{PHYSICAL}.general"],
    ("Other Service Providers", "Naprapath"):
        [f"{PHYSICAL}.musculoskeletal"],
    ("Other Service Providers", "Naturopath"):
        [f"{PHYSICAL}.general", f"{LIFESTYLE}.general"],
    ("Other Service Providers", "Peer Specialist"):
        [f"{MENTAL}.cognitive-behavioral", f"{SOCIAL}.general",
         f"{MEANING}.life-transitions"],
    ("Other Service Providers", "Prevention Professional"):
        [f"{LIFESTYLE}.general"],
    ("Other Service Providers", "Reflexologist"):
        [f"{PHYSICAL}.musculoskeletal"],
    ("Other Service Providers", "Sleep Specialist, PhD"):
        [f"{PHYSICAL}.sleep"],
    ("Other Service Providers", "Specialist"):
        [f"{PHYSICAL}.general"],
    ("Other Service Providers", "Veterinarian"):
        [f"{PHYSICAL}.general"],
    # ---- Pharmacy Service Providers ----
    ("Pharmacy Service Providers", "Pharmacist"):
        [f"{PHYSICAL}.general", f"{LIFESTYLE}.substance-use"],
    ("Pharmacy Service Providers", "Pharmacy Technician"):
        [f"{PHYSICAL}.general"],
    # ---- Physician Assistants & Advanced Practice Nursing Providers ----
    ("Physician Assistants & Advanced Practice Nursing Providers", "Advanced Practice Midwife"):
        [f"{ENVIRONMENTAL}.caregiving", f"{PHYSICAL}.general"],
    ("Physician Assistants & Advanced Practice Nursing Providers", "Anesthesiologist Assistant"):
        [f"{PHYSICAL}.general"],
    ("Physician Assistants & Advanced Practice Nursing Providers", "Clinical Nurse Specialist"):
        [f"{PHYSICAL}.general", f"{MENTAL}.general",
         f"{FUNCTIONAL}.general"],
    ("Physician Assistants & Advanced Practice Nursing Providers", "Nurse Anesthetist, Certified Registered"):
        [f"{PHYSICAL}.general"],
    ("Physician Assistants & Advanced Practice Nursing Providers", "Nurse Practitioner"):
        [f"{PHYSICAL}.general", f"{MENTAL}.general"],
    ("Physician Assistants & Advanced Practice Nursing Providers", "Physician Assistant"):
        [f"{PHYSICAL}.general"],
    # ---- Podiatric Medicine & Surgery Service Providers ----
    ("Podiatric Medicine & Surgery Service Providers", "Assistant, Podiatric"):
        [f"{PHYSICAL}.musculoskeletal"],
    ("Podiatric Medicine & Surgery Service Providers", "Podiatrist"):
        [f"{PHYSICAL}.musculoskeletal"],
    # ---- Respiratory, Developmental, Rehabilitative and Restorative Service Providers ----
    ("Respiratory, Developmental, Rehabilitative and Restorative Service Providers", "Anaplastologist"):
        [f"{PHYSICAL}.dermatologic"],
    ("Respiratory, Developmental, Rehabilitative and Restorative Service Providers", "Art Therapist"):
        [f"{MENTAL}.trauma-grief", f"{MENTAL}.cognitive-behavioral"],
    ("Respiratory, Developmental, Rehabilitative and Restorative Service Providers", "Clinical Exercise Physiologist"):
        [f"{LIFESTYLE}.physical-activity", f"{PHYSICAL}.cardio-respiratory"],
    ("Respiratory, Developmental, Rehabilitative and Restorative Service Providers", "Dance Therapist"):
        [f"{MENTAL}.cognitive-behavioral", f"{PHYSICAL}.musculoskeletal"],
    ("Respiratory, Developmental, Rehabilitative and Restorative Service Providers", "Developmental Therapist"):
        [f"{FUNCTIONAL}.general"],
    ("Respiratory, Developmental, Rehabilitative and Restorative Service Providers", "Kinesiotherapist"):
        [f"{PHYSICAL}.musculoskeletal", f"{FUNCTIONAL}.mobility"],
    ("Respiratory, Developmental, Rehabilitative and Restorative Service Providers", "Massage Therapist"):
        [f"{PHYSICAL}.musculoskeletal"],
    ("Respiratory, Developmental, Rehabilitative and Restorative Service Providers", "Mastectomy Fitter"):
        [f"{PHYSICAL}.general"],
    ("Respiratory, Developmental, Rehabilitative and Restorative Service Providers", "Music Therapist"):
        [f"{MENTAL}.cognitive-behavioral", f"{MENTAL}.trauma-grief"],
    ("Respiratory, Developmental, Rehabilitative and Restorative Service Providers", "Occupational Therapist"):
        [f"{FUNCTIONAL}.daily-living", f"{FUNCTIONAL}.mobility",
         f"{FUNCTIONAL}.work-capacity", f"{PHYSICAL}.musculoskeletal",
         f"{ENVIRONMENTAL}.ergonomics"],
    ("Respiratory, Developmental, Rehabilitative and Restorative Service Providers", "Occupational Therapy Assistant"):
        [f"{FUNCTIONAL}.daily-living", f"{FUNCTIONAL}.mobility",
         f"{ENVIRONMENTAL}.ergonomics"],
    ("Respiratory, Developmental, Rehabilitative and Restorative Service Providers", "Orthotic Fitter"):
        [f"{PHYSICAL}.musculoskeletal"],
    ("Respiratory, Developmental, Rehabilitative and Restorative Service Providers", "Orthotist"):
        [f"{PHYSICAL}.musculoskeletal"],
    ("Respiratory, Developmental, Rehabilitative and Restorative Service Providers", "Pedorthist"):
        [f"{PHYSICAL}.musculoskeletal"],
    ("Respiratory, Developmental, Rehabilitative and Restorative Service Providers", "Physical Therapist"):
        [f"{FUNCTIONAL}.mobility", f"{PHYSICAL}.musculoskeletal",
         f"{ENVIRONMENTAL}.ergonomics"],
    ("Respiratory, Developmental, Rehabilitative and Restorative Service Providers", "Physical Therapy Assistant"):
        [f"{FUNCTIONAL}.mobility", f"{PHYSICAL}.musculoskeletal",
         f"{ENVIRONMENTAL}.ergonomics"],
    ("Respiratory, Developmental, Rehabilitative and Restorative Service Providers", "Prosthetist"):
        [f"{FUNCTIONAL}.mobility"],
    ("Respiratory, Developmental, Rehabilitative and Restorative Service Providers", "Pulmonary Function Technologist"):
        [f"{PHYSICAL}.cardio-respiratory"],
    ("Respiratory, Developmental, Rehabilitative and Restorative Service Providers", "Recreation Therapist"):
        [f"{MENTAL}.cognitive-behavioral", f"{SOCIAL}.general",
         f"{FUNCTIONAL}.daily-living"],
    ("Respiratory, Developmental, Rehabilitative and Restorative Service Providers", "Recreational Therapist Assistant"):
        [f"{MENTAL}.cognitive-behavioral", f"{FUNCTIONAL}.daily-living"],
    ("Respiratory, Developmental, Rehabilitative and Restorative Service Providers", "Rehabilitation Counselor"):
        [f"{FUNCTIONAL}.work-capacity", f"{MENTAL}.cognitive-behavioral",
         f"{SOCIAL}.general"],
    ("Respiratory, Developmental, Rehabilitative and Restorative Service Providers", "Rehabilitation Practitioner"):
        [f"{FUNCTIONAL}.general"],
    ("Respiratory, Developmental, Rehabilitative and Restorative Service Providers", "Respiratory Therapist, Certified"):
        [f"{PHYSICAL}.cardio-respiratory"],
    ("Respiratory, Developmental, Rehabilitative and Restorative Service Providers", "Respiratory Therapist, Registered"):
        [f"{PHYSICAL}.cardio-respiratory"],
    ("Respiratory, Developmental, Rehabilitative and Restorative Service Providers", "Specialist/Technologist"):
        [f"{PHYSICAL}.cardio-respiratory"],
    # ---- Speech, Language and Hearing Service Providers ----
    ("Speech, Language and Hearing Service Providers", "Audiologist"):
        [f"{PHYSICAL}.sensory", f"{SOCIAL}.communication"],
    ("Speech, Language and Hearing Service Providers", "Audiologist-Hearing Aid Fitter"):
        [f"{PHYSICAL}.sensory"],
    ("Speech, Language and Hearing Service Providers", "Hearing Instrument Specialist"):
        [f"{PHYSICAL}.sensory"],
    ("Speech, Language and Hearing Service Providers", "Specialist/Technologist"):
        [f"{PHYSICAL}.sensory", f"{SOCIAL}.communication"],
    ("Speech, Language and Hearing Service Providers", "Speech-Language Pathologist"):
        [f"{SOCIAL}.communication", f"{FUNCTIONAL}.attention-cognition",
         f"{PHYSICAL}.sensory"],
    # ---- Student, Health Care ----
    ("Student, Health Care", "Student in an Organized Health Care Education/Training Program"):
        [f"{PHYSICAL}.general", f"{MENTAL}.general", f"{SOCIAL}.general",
         f"{FUNCTIONAL}.general"],
    # ---- Technologists, Technicians & Other Technical Service Providers ----
    ("Technologists, Technicians & Other Technical Service Providers", "Perfusionist"):
        [f"{PHYSICAL}.cardio-respiratory"],
    ("Technologists, Technicians & Other Technical Service Providers", "Radiologic Technologist"):
        [f"{PHYSICAL}.general"],
    ("Technologists, Technicians & Other Technical Service Providers", "Radiology Practitioner Assistant"):
        [f"{PHYSICAL}.general"],
    ("Technologists, Technicians & Other Technical Service Providers", "Specialist/Technologist Cardiovascular"):
        [f"{PHYSICAL}.cardio-respiratory"],
    ("Technologists, Technicians & Other Technical Service Providers", "Specialist/Technologist, Health Information"):
        [f"{PHYSICAL}.general", f"{FUNCTIONAL}.general"],
    ("Technologists, Technicians & Other Technical Service Providers", "Specialist/Technologist, Other"):
        [f"{PHYSICAL}.general"],
    ("Technologists, Technicians & Other Technical Service Providers", "Specialist/Technologist, Pathology"):
        [f"{PHYSICAL}.general"],
    ("Technologists, Technicians & Other Technical Service Providers", "Technician, Cardiology"):
        [f"{PHYSICAL}.cardio-respiratory"],
    ("Technologists, Technicians & Other Technical Service Providers", "Technician, Health Information"):
        [f"{PHYSICAL}.general"],
    ("Technologists, Technicians & Other Technical Service Providers", "Technician, Other"):
        [f"{PHYSICAL}.general"],
    ("Technologists, Technicians & Other Technical Service Providers", "Technician, Pathology"):
        [f"{PHYSICAL}.general"],
}


def pairs_from_cache():
    with open(CACHE) as f:
        rows = list(csv.reader(f))
    hdr = rows[0]
    gi, ci, si = hdr.index("Grouping"), hdr.index("Classification"), hdr.index("Section")
    out = set()
    for r in rows[1:]:
        if len(r) <= si or r[si].strip() != "Individual":
            continue
        if r[ci].strip():
            out.add((r[gi].strip(), r[ci].strip()))
    return out


def valid_paths():
    with open(os.path.join(ROOT, "internal", "data", "specialty", "config", "domains.json")) as f:
        domains = json.load(f)
    valid = set()
    for core, cfg in domains.items():
        valid.add(core)
        for sub in cfg.get("subdomains", {}):
            valid.add(f"{core}.{sub}")
    return valid


def main():
    pairs = pairs_from_cache()
    missing = pairs - set(CURATED)
    extra = set(CURATED) - pairs
    if missing or extra:
        print("MISSING pairs:")
        for p in sorted(missing):
            print("  ", p)
        print("EXTRA non-Individual pairs:")
        for p in sorted(extra):
            print("  ", p)
        sys.exit(1)

    valid = valid_paths()
    bad = [(p, path) for p, paths in CURATED.items() for path in paths if path not in valid]
    if bad:
        print("Invalid paths:")
        for p, path in bad:
            print("  ", p, path)
        sys.exit(1)

    matrix = {f"{g}|{c}": paths for (g, c), paths in sorted(CURATED.items())}
    with open(OUT, "w") as f:
        json.dump(matrix, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"Wrote {len(matrix)} entries to {OUT}")


if __name__ == "__main__":
    main()
    now = __import__("datetime").datetime.now()
    print(f"reviewed: {now.isoformat(timespec='minutes')}")