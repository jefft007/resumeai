import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs';

type AuthMode = 'login' | 'signup';

interface AnalysisHistoryItem {
  id: number;
  filename: string;
  date: string;
  analysis: any;
}

@Component({
  selector: 'app-resume-upload',
  templateUrl: './resume-upload.component.html',
  styleUrls: ['./resume-upload.component.css']
})
export class ResumeUploadComponent {

  private readonly apiUrl = 'https://resumeai-2ai9.onrender.com';
  private readonly historyStorageKey = 'resume_analysis_history';
  private readonly userStorageKey = 'resume_user';

  constructor(private http: HttpClient) {
    this.loadStoredState();
  }

  // ===== UI =====
  isDarkMode = false;
  isLoading = false;
  activeTab = 'dashboard';

  // ===== FILE =====
  selectedFile: File | null = null;

  // ===== RESULTS =====
  analysisResult: any = null;
  historyList: AnalysisHistoryItem[] = [];

  // ===== SKILLS =====
  userSkills: string[] = [];
  newSkillInput = '';

  // ===== REWRITE =====
  jobDescription = '';
  rewriting = false;
  rewriteResult: any = null;

  // ===== JOBS =====
  recommendedJobs: any[] = [];

  // ===== INTERVIEW =====
  interviewPrepList: any[] = [];
  loadingInterview = false;
  activeInterviewQuestion: number | null = null;

  // ===== AUTH =====
  showAuthModal = false;
  authMode: AuthMode = 'login';
  authUsername = '';
  authName = '';
  currentUser: any = null;

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    if (file && file.type !== 'application/pdf') {
      alert('Please select a PDF resume.');
      input.value = '';
      this.selectedFile = null;
      return;
    }

    this.selectedFile = file;
  }

  uploadResume() {
    if (!this.selectedFile) {
      alert('Please select a resume PDF.');
      return;
    }

    const formData = new FormData();
    formData.append('resume', this.selectedFile);

    this.isLoading = true;
    this.analysisResult = null;
    this.rewriteResult = null;
    this.interviewPrepList = [];
    this.activeInterviewQuestion = null;

    this.http.post<any>(`${this.apiUrl}/analyze`, formData)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (res) => {
          this.analysisResult = res;
          this.userSkills = this.uniqueSkills(res.detected_skills || []);
          this.activeTab = 'dashboard';
          this.generateRecommendedJobs();
          this.saveHistory(res);
        },
        error: (err) => {
          console.error('Analyze failed:', err);
          alert(err?.error?.error || 'Backend error. Please try again after a moment.');
        }
      });
  }

  generateRecommendedJobs() {
    if (!this.analysisResult) return;

    const role = this.analysisResult.best_suited_role || 'Software Developer';
    const detected = this.uniqueSkills(this.userSkills);
    const missing = this.analysisResult.missing_skills || [];
    const score = Math.max(0, Math.min(100, Number(this.analysisResult.ats_score) || 0));

    const roleTemplates: Record<string, any> = {
      'Frontend Developer': {
        logo: '💼',
        title: 'Frontend Developer',
        required: ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'Angular', 'React']
      },
      'Backend Developer': {
        logo: '💼',
        title: 'Backend Developer',
        required: ['Python', 'Java', 'Node.js', 'Express', 'Flask', 'SQL', 'MongoDB']
      },
      'Full Stack Developer': {
        logo: '💼',
        title: 'Full Stack Developer',
        required: ['JavaScript', 'TypeScript', 'React', 'Angular', 'Node.js', 'SQL', 'Git']
      },
      'AI/ML Engineer': {
        logo: '💼',
        title: 'AI/ML Engineer',
        required: ['Python', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'NLP']
      },
      'Data Scientist': {
        logo: '💼',
        title: 'Data Scientist',
        required: ['Python', 'SQL', 'Pandas', 'NumPy', 'Machine Learning', 'Data Science']
      },
      'DevOps Engineer': {
        logo: '💼',
        title: 'DevOps Engineer',
        required: ['Docker', 'Kubernetes', 'AWS', 'Azure', 'Jenkins', 'Git']
      }
    };

    const template = roleTemplates[role] || {
      logo: '💼',
      title: role,
      required: ['Git', 'SQL', 'JavaScript', 'Python', 'Problem Solving']
    };

    const normalizedDetected = new Set(detected.map(skill => skill.toLowerCase()));
    const matchedRequired = template.required.filter((skill: string) =>
      normalizedDetected.has(skill.toLowerCase())
    );
    const missingRequired = template.required.filter((skill: string) =>
      !normalizedDetected.has(skill.toLowerCase())
    );

    this.recommendedJobs = [
      {
        logo: template.logo,
        title: template.title,
        company: 'Target Software Role',
        location: 'Remote / Hybrid',
        salary: 'Based on experience',
        description: `Target ${template.title} role requiring ${template.required.join(', ')}.`,
        matchScore: score,
        matchedSkills: matchedRequired.length ? matchedRequired : detected.slice(0, 6),
        missingSkills: missingRequired.length ? missingRequired : missing.slice(0, 6)
      }
    ];
  }

  selectHistoryItem(item: AnalysisHistoryItem) {
    this.analysisResult = item.analysis;
    this.userSkills = this.uniqueSkills(item.analysis?.detected_skills || []);
    this.activeTab = 'dashboard';
    this.generateRecommendedJobs();
  }

  deleteHistoryItem(event: Event, id: number) {
    event.stopPropagation();
    this.historyList = this.historyList.filter(item => item.id !== id);
    this.persistHistory();
  }

  addSkill() {
    const skill = this.newSkillInput.trim();
    if (!skill) return;

    const exists = this.userSkills.some(item => item.toLowerCase() === skill.toLowerCase());
    if (!exists) {
      this.userSkills = [...this.userSkills, skill];
      this.generateRecommendedJobs();
    }

    this.newSkillInput = '';
  }

  removeSkill(skill: string) {
    this.userSkills = this.userSkills.filter(item => item !== skill);
    this.generateRecommendedJobs();
  }

  getRewrite() {
    if (!this.analysisResult || !this.jobDescription.trim()) return;

    this.rewriting = true;

    this.http.post<any>(`${this.apiUrl}/rewrite`, {
      resume_text: this.analysisResult.extracted_text,
      job_description: this.jobDescription
    })
      .pipe(finalize(() => this.rewriting = false))
      .subscribe({
        next: (res) => this.rewriteResult = res,
        error: (err) => {
          console.error('Rewrite failed:', err);
          alert(err?.error?.error || 'Unable to rewrite resume right now.');
        }
      });
  }

  getInterviewQuestions() {
    if (!this.analysisResult || this.loadingInterview) return;

    this.loadingInterview = true;

    this.http.post<any>(`${this.apiUrl}/interview-prep`, {
      role: this.analysisResult.best_suited_role,
      resume_text: this.analysisResult.extracted_text
    })
      .pipe(finalize(() => this.loadingInterview = false))
      .subscribe({
        next: (res) => this.interviewPrepList = res.questions || [],
        error: (err) => {
          console.error('Interview prep failed:', err);
          alert(err?.error?.error || 'Unable to generate interview questions right now.');
        }
      });
  }

  toggleInterviewQuestion(i: number) {
    this.activeInterviewQuestion =
      this.activeInterviewQuestion === i ? null : i;
  }

  openAuth(mode: AuthMode) {
    this.authMode = mode;
    this.showAuthModal = true;
  }

  closeAuth() {
    this.showAuthModal = false;
  }

  handleAuthSubmit() {
    const username = this.authUsername.trim();
    if (!username) return;

    this.currentUser = {
      name: this.authName.trim() || username,
      username
    };

    localStorage.setItem(this.userStorageKey, JSON.stringify(this.currentUser));
    this.closeAuth();
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem(this.userStorageKey);
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    document.body.classList.toggle('dark', this.isDarkMode);
  }

  downloadPDF() {
    window.print();
  }

  private saveHistory(analysis: any) {
    this.historyList = [
      {
        id: Date.now(),
        filename: this.selectedFile?.name || 'Resume analysis',
        date: new Date().toLocaleDateString(),
        analysis
      },
      ...this.historyList
    ].slice(0, 10);

    this.persistHistory();
  }

  private persistHistory() {
    localStorage.setItem(this.historyStorageKey, JSON.stringify(this.historyList));
  }

  private loadStoredState() {
    try {
      const user = localStorage.getItem(this.userStorageKey);
      const history = localStorage.getItem(this.historyStorageKey);

      this.currentUser = user ? JSON.parse(user) : null;
      this.historyList = history ? JSON.parse(history) : [];
    } catch {
      localStorage.removeItem(this.userStorageKey);
      localStorage.removeItem(this.historyStorageKey);
    }
  }

  private uniqueSkills(skills: string[]) {
    return skills.filter((skill, index, list) =>
      skill && list.findIndex(item => item.toLowerCase() === skill.toLowerCase()) === index
    );
  }
}
