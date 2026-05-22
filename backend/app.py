from flask import Flask, request, jsonify
from flask_cors import CORS
import pdfplumber
import requests
import json
import re
import os

app = Flask(__name__)
CORS(app, origins=["*"])

# =========================
# API KEY
# =========================
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")

if not OPENROUTER_API_KEY:
    print("WARNING: OPENROUTER_API_KEY is missing!")

# =========================
# HEALTH CHECK
# =========================
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "Resume AI Backend Running"
    })


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok"
    })


# =========================
# EXTRACT PDF TEXT
# =========================
def extract_resume_text(file):
    text = ""

    with pdfplumber.open(file) as pdf:
        for page in pdf.pages:
            extracted = page.extract_text()

            if extracted:
                text += extracted + "\n"

    return text.strip()


# =========================
# SAFE KEYWORD MATCHING
# =========================
def normalize_text(text):
    return re.sub(r"\s+", " ", text.lower()).strip()


def contains_phrase(text, phrase):
    escaped = re.escape(phrase.lower()).replace(r"\ ", r"\s+")
    pattern = rf"(?<![a-z0-9+#.]){escaped}(?![a-z0-9+#.])"
    return re.search(pattern, text) is not None


def detect_years_experience(text):
    year_patterns = [
        r"(\d+)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)",
        r"(?:experience|exp)\s*(?:of\s*)?(\d+)\+?\s*(?:years?|yrs?)"
    ]

    years = []
    for pattern in year_patterns:
        years.extend(int(match) for match in re.findall(pattern, text))

    return max(years) if years else 0


# =========================
# LOCAL ATS ANALYSIS
# =========================
def local_resume_analysis(text):

    text_lower = normalize_text(text)
    word_count = len(re.findall(r"\b\w+\b", text_lower))

    skill_catalog = [
        {"name": "Python", "aliases": ["python"], "weight": 6, "roles": ["backend", "ai", "data"]},
        {"name": "Java", "aliases": ["java"], "weight": 6, "roles": ["backend"]},
        {"name": "C++", "aliases": ["c++", "cpp"], "weight": 5, "roles": ["backend"]},
        {"name": "HTML", "aliases": ["html", "html5"], "weight": 4, "roles": ["frontend"]},
        {"name": "CSS", "aliases": ["css", "css3"], "weight": 4, "roles": ["frontend"]},
        {"name": "JavaScript", "aliases": ["javascript", "js"], "weight": 7, "roles": ["frontend", "backend", "fullstack"]},
        {"name": "TypeScript", "aliases": ["typescript", "ts"], "weight": 7, "roles": ["frontend", "fullstack"]},
        {"name": "Angular", "aliases": ["angular"], "weight": 8, "roles": ["frontend", "fullstack"]},
        {"name": "React", "aliases": ["react", "reactjs", "react.js"], "weight": 8, "roles": ["frontend", "fullstack"]},
        {"name": "Node.js", "aliases": ["node", "node.js", "nodejs"], "weight": 7, "roles": ["backend", "fullstack"]},
        {"name": "Express", "aliases": ["express", "express.js", "expressjs"], "weight": 6, "roles": ["backend", "fullstack"]},
        {"name": "Flask", "aliases": ["flask"], "weight": 7, "roles": ["backend"]},
        {"name": "Django", "aliases": ["django"], "weight": 7, "roles": ["backend"]},
        {"name": "Spring Boot", "aliases": ["spring boot", "springboot"], "weight": 9, "roles": ["backend"]},
        {"name": "SQL", "aliases": ["sql"], "weight": 6, "roles": ["backend", "data"]},
        {"name": "MySQL", "aliases": ["mysql"], "weight": 5, "roles": ["backend", "data"]},
        {"name": "MongoDB", "aliases": ["mongodb", "mongo db"], "weight": 7, "roles": ["backend", "fullstack"]},
        {"name": "Firebase", "aliases": ["firebase"], "weight": 5, "roles": ["backend", "fullstack"]},
        {"name": "Git", "aliases": ["git"], "weight": 5, "roles": ["frontend", "backend", "fullstack", "devops"]},
        {"name": "GitHub", "aliases": ["github"], "weight": 4, "roles": ["frontend", "backend", "fullstack", "devops"]},
        {"name": "Docker", "aliases": ["docker"], "weight": 8, "roles": ["backend", "devops"]},
        {"name": "Kubernetes", "aliases": ["kubernetes", "k8s"], "weight": 10, "roles": ["devops"]},
        {"name": "AWS", "aliases": ["aws", "amazon web services"], "weight": 9, "roles": ["backend", "devops"]},
        {"name": "Azure", "aliases": ["azure", "microsoft azure"], "weight": 9, "roles": ["backend", "devops"]},
        {"name": "Jenkins", "aliases": ["jenkins"], "weight": 7, "roles": ["devops"]},
        {"name": "Machine Learning", "aliases": ["machine learning", "ml"], "weight": 11, "roles": ["ai", "data"]},
        {"name": "Deep Learning", "aliases": ["deep learning"], "weight": 10, "roles": ["ai"]},
        {"name": "NLP", "aliases": ["nlp", "natural language processing"], "weight": 9, "roles": ["ai", "data"]},
        {"name": "TensorFlow", "aliases": ["tensorflow"], "weight": 9, "roles": ["ai"]},
        {"name": "PyTorch", "aliases": ["pytorch"], "weight": 9, "roles": ["ai"]},
        {"name": "Data Science", "aliases": ["data science"], "weight": 10, "roles": ["data"]},
        {"name": "Pandas", "aliases": ["pandas"], "weight": 6, "roles": ["data", "ai"]},
        {"name": "NumPy", "aliases": ["numpy"], "weight": 6, "roles": ["data", "ai"]},
        {"name": "Matplotlib", "aliases": ["matplotlib"], "weight": 5, "roles": ["data"]},
        {"name": "Tailwind CSS", "aliases": ["tailwind", "tailwind css"], "weight": 5, "roles": ["frontend"]},
        {"name": "Bootstrap", "aliases": ["bootstrap"], "weight": 4, "roles": ["frontend"]},
    ]

    detected_skills = []
    detected_skill_names = set()
    role_scores = {
        "frontend": 0,
        "backend": 0,
        "fullstack": 0,
        "ai": 0,
        "data": 0,
        "devops": 0
    }

    for skill in skill_catalog:
        if any(contains_phrase(text_lower, alias) for alias in skill["aliases"]):
            detected_skills.append(skill["name"])
            detected_skill_names.add(skill["name"])
            for role in skill["roles"]:
                role_scores[role] += skill["weight"]

    role_phrase_boosts = {
        "frontend": ["frontend developer", "front end developer", "ui developer", "web developer"],
        "backend": ["backend developer", "back end developer", "api developer", "server side"],
        "fullstack": ["full stack", "fullstack", "mern", "mean stack"],
        "ai": ["ai engineer", "ml engineer", "machine learning engineer"],
        "data": ["data scientist", "data analyst", "analytics"],
        "devops": ["devops", "cloud engineer", "site reliability"]
    }

    for role, phrases in role_phrase_boosts.items():
        if any(contains_phrase(text_lower, phrase) for phrase in phrases):
            role_scores[role] += 12

    if role_scores["frontend"] >= 18 and role_scores["backend"] >= 18:
        role_scores["fullstack"] += 16

    role_map = {
        "frontend": "Frontend Developer",
        "backend": "Backend Developer",
        "fullstack": "Full Stack Developer",
        "ai": "AI/ML Engineer",
        "data": "Data Scientist",
        "devops": "DevOps Engineer"
    }

    best_key = max(role_scores, key=role_scores.get)
    best_role = role_map[best_key] if role_scores[best_key] >= 12 else "Software Developer"

    role_requirements = {
        "Frontend Developer": ["HTML", "CSS", "JavaScript", "TypeScript", "React", "Angular", "Git"],
        "Backend Developer": ["Python", "Java", "Node.js", "SQL", "MongoDB", "Docker", "Git"],
        "Full Stack Developer": ["HTML", "CSS", "JavaScript", "TypeScript", "React", "Node.js", "SQL", "Git"],
        "AI/ML Engineer": ["Python", "Machine Learning", "Deep Learning", "Pandas", "NumPy", "TensorFlow", "PyTorch"],
        "Data Scientist": ["Python", "SQL", "Data Science", "Pandas", "NumPy", "Machine Learning", "Matplotlib"],
        "DevOps Engineer": ["Docker", "Kubernetes", "AWS", "Azure", "Jenkins", "Git"],
        "Software Developer": ["Git", "SQL", "JavaScript", "Python", "Problem Solving"]
    }

    missing_skills = [
        skill for skill in role_requirements[best_role]
        if skill not in detected_skill_names
    ]

    years_experience = detect_years_experience(text_lower)
    has_email = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", text) is not None
    has_phone = re.search(r"(\+?\d[\d\s().-]{8,}\d)", text) is not None
    has_linkedin = "linkedin.com" in text_lower or "linkedin" in text_lower
    has_github = "github.com" in text_lower or "GitHub" in detected_skill_names
    has_education = any(contains_phrase(text_lower, item) for item in [
        "bca", "mca", "btech", "b.tech", "be", "b.e", "computer science",
        "information technology", "degree", "university", "college"
    ])
    has_summary = any(contains_phrase(text_lower, item) for item in [
        "summary", "profile", "objective", "professional summary"
    ])
    project_count = len(re.findall(r"\bprojects?\b", text_lower))
    action_verbs = [
        "built", "developed", "created", "implemented", "designed", "deployed",
        "optimized", "improved", "integrated", "managed", "led", "automated"
    ]
    action_verb_count = sum(1 for verb in action_verbs if contains_phrase(text_lower, verb))

    skill_score = min(35, sum(
        skill["weight"] for skill in skill_catalog
        if skill["name"] in detected_skill_names
    ) * 0.75)
    experience_score = min(15, years_experience * 3)
    if any(contains_phrase(text_lower, item) for item in ["internship", "intern", "freelance", "experience", "worked"]):
        experience_score = max(experience_score, 6)

    project_score = min(10, project_count * 4)
    education_score = 8 if has_education else 0
    contact_score = sum([has_email, has_phone, has_linkedin, has_github]) * 2

    if 250 <= word_count <= 800:
        length_score = 10
    elif 150 <= word_count < 250 or 800 < word_count <= 1000:
        length_score = 7
    elif 80 <= word_count < 150:
        length_score = 4
    else:
        length_score = 2

    structure_score = 0
    structure_score += 4 if has_summary else 0
    structure_score += min(6, action_verb_count)

    score = round(
        12 +
        skill_score +
        experience_score +
        project_score +
        education_score +
        contact_score +
        length_score +
        structure_score
    )
    score = max(15, min(98, score))

    improvements = []

    if not has_email or not has_phone:
        improvements.append("Add clear email and phone contact details near the top.")
    if not has_linkedin:
        improvements.append("Add a LinkedIn profile link.")
    if not has_github and best_role in ["Frontend Developer", "Backend Developer", "Full Stack Developer", "AI/ML Engineer", "Data Scientist"]:
        improvements.append("Add a GitHub or portfolio link with project code.")
    if not has_summary:
        improvements.append("Add a short professional summary targeted to the role.")
    if project_count < 2:
        improvements.append("Add at least two projects with tech stack, features, and measurable impact.")
    if experience_score < 6:
        improvements.append("Mention internships, freelance work, practical training, or real project experience.")
    if action_verb_count < 4:
        improvements.append("Start bullet points with strong action verbs like built, implemented, deployed, and optimized.")
    if word_count < 180:
        improvements.append("Resume content is too short; add more role-relevant details and project outcomes.")
    if missing_skills:
        improvements.append(f"Add or strengthen role keywords for {best_role}: {', '.join(missing_skills[:5])}.")

    if not improvements:
        improvements.append("Resume is well aligned; tailor the summary and project bullets for each job description.")

    return {
        "ats_score": score,
        "detected_skills": detected_skills[:18],
        "missing_skills": missing_skills[:10],
        "best_suited_role": best_role,
        "improvements": improvements[:8],
        "analysis_summary": {
            "word_count": word_count,
            "years_experience": years_experience,
            "projects_found": project_count,
            "contact_complete": has_email and has_phone,
            "role_scores": role_scores
        },
        "extracted_text": text
    }

# =========================
# AI RESUME ANALYSIS
# =========================
def ai_resume_analysis(text):
    prompt = f"""
    You are an expert ATS (Applicant Tracking System) and technical recruiter.
    Analyze the following resume text and extract the required information in JSON format.
    
    Resume Text:
    {text}
    
    You MUST return ONLY valid JSON matching this exact structure, with no markdown formatting or extra text:
    {{
        "ats_score": (integer 0-100 based on quality, impact, and formatting),
        "detected_skills": [(list of strings, up to 18 technical skills found)],
        "missing_skills": [(list of strings, up to 10 important skills missing for the best suited role)],
        "best_suited_role": (one of: "Frontend Developer", "Backend Developer", "Full Stack Developer", "AI/ML Engineer", "Data Scientist", "DevOps Engineer", or "Software Developer"),
        "improvements": [(list of strings, up to 8 specific, actionable bullet points to improve the resume)],
        "analysis_summary": {{
            "word_count": (integer, estimated word count),
            "years_experience": (integer, total years of experience, 0 if none),
            "projects_found": (integer, number of projects),
            "contact_complete": (boolean, true if email and phone are present),
            "role_scores": {{"frontend": 0, "backend": 0, "fullstack": 0, "ai": 0, "data": 0, "devops": 0}}
        }}
    }}
    """
    
    result = call_llm_json(prompt)
    if result and "ats_score" in result:
        result["extracted_text"] = text
        return result
    return None


# =========================
# OPENROUTER API CALL
# =========================
def call_llm_json(prompt):

    try:

        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "meta-llama/llama-3-8b-instruct:free",
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            },
            timeout=60
        )

        result = response.json()

        if "choices" not in result:
            print("OpenRouter Error:", result)
            return None

        content = result["choices"][0]["message"]["content"]

        match = re.search(r'(\{.*\}|\[.*\])', content, re.DOTALL)

        if match:
            content = match.group(1)

        return json.loads(content)

    except Exception as e:
        print("LLM ERROR:", str(e))
        return None


# =========================
# ANALYZE RESUME
# =========================
@app.route("/analyze", methods=["POST"])
def analyze_resume():

    try:

        file = request.files.get("resume")

        if not file:
            return jsonify({
                "error": "No resume uploaded"
            }), 400

        text = extract_resume_text(file)

        if not text:
            return jsonify({
                "error": "Unable to extract text from PDF"
            }), 400

        # Try highly accurate LLM analysis first
        analysis = ai_resume_analysis(text)
        
        # Fallback to local rule-based analysis if LLM fails
        if not analysis:
            analysis = local_resume_analysis(text)

        return jsonify(analysis)

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# =========================
# REWRITE RESUME
# =========================
@app.route("/rewrite", methods=["POST"])
def rewrite_resume():

    try:

        data = request.json or {}

        resume_text = data.get("resume_text", "")
        job_description = data.get("job_description", "")

        prompt = f"""
        Rewrite and optimize this resume for ATS.

        Resume:
        {resume_text}

        Job Description:
        {job_description}

        Return ONLY valid JSON:

        {{
            "rewritten_resume": "",
            "changes_made": []
        }}
        """

        result = call_llm_json(prompt)

        if not result:

            result = {
                "rewritten_resume": resume_text,
                "changes_made": [
                    "Added ATS keywords",
                    "Improved formatting",
                    "Enhanced project descriptions"
                ]
            }

        return jsonify(result)

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# =========================
# INTERVIEW PREP
# =========================
@app.route("/interview-prep", methods=["POST"])
def interview_prep():

    try:

        data = request.json or {}

        role = data.get("role", "")
        resume_text = data.get("resume_text", "")

        prompt = f"""
        Generate interview questions for this role.

        Role:
        {role}

        Resume:
        {resume_text}

        Return ONLY valid JSON:

        {{
            "questions": [
                {{
                    "question": "",
                    "answer": "",
                    "type": ""
                }}
            ]
        }}
        """

        result = call_llm_json(prompt)

        if not result:

            result = {
                "questions": [
                    {
                        "question": "Tell me about yourself.",
                        "answer": "Explain your background, skills, and projects.",
                        "type": "Behavioral"
                    },
                    {
                        "question": f"What technologies are important for a {role}?",
                        "answer": "Discuss frameworks, tools, and best practices.",
                        "type": "Technical"
                    }
                ]
            }

        return jsonify(result)

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# =========================
# START SERVER
# =========================
if __name__ == "__main__":

    port = int(os.environ.get("PORT", 10000))

    app.run(
        host="0.0.0.0",
        port=port,
        debug=True
    )
