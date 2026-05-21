import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-resume-upload',
  templateUrl: './resume-upload.component.html',
  styleUrls: ['./resume-upload.component.css']
})
export class ResumeUploadComponent {

  constructor(private http: HttpClient) {}

  // ===== UI =====
  isDarkMode = false;
  isLoading = false;
  activeTab = 'dashboard';

  // ===== FILE =====
  selectedFile: File | null = null;

  // ===== RESULTS =====
  analysisResult: any = null;
  historyList: any[] = [];

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
  authMode: 'login' | 'signup' = 'login';
  authUsername = '';
  authName = '';
  currentUser: any = null;

  // =========================================
  // FILE SELECT
  // =========================================
  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  // =========================================
  // UPLOAD + ANALYZE
  // =========================================
  uploadResume() {

    if (!this.selectedFile) {
      alert('Please select a resume');
      return;
    }

    const formData = new FormData();
    formData.append('resume', this.selectedFile);

    this.isLoading = true;

    this.http.post<any>(
      'http://127.0.0.1:10000/analyze',
      formData
    ).subscribe({

      next: (res) => {

        console.log("REAL API RESPONSE:", res);

        this.analysisResult = res;

        // skills
        this.userSkills = res.detected_skills || [];

        // jobs
        this.generateRecommendedJobs();

        // save history
        this.historyList.unshift({
          id: Date.now(),
          name: this.selectedFile?.name,
          analysis: res
        });

        this.isLoading = false;
      },

      error: (err) => {
        console.error(err);
        alert('Backend error');
        this.isLoading = false;
      }
    });
  }

  // =========================================
  // GENERATE JOBS
  // =========================================
  generateRecommendedJobs() {

    if (!this.analysisResult) return;

    const role = this.analysisResult.best_suited_role || 'Developer';
    const skills = this.analysisResult.detected_skills || [];

    this.recommendedJobs = [
      {
        logo: "💼",
        title: role,
        company: "Tech Company",
        location: "Remote",
        salary: "4-12 LPA",
        description: `Hiring ${role} with ${skills.slice(0,3).join(', ')}`,
        matchScore: this.analysisResult.ats_score,
        matchedSkills: skills.slice(0, 5),
        missingSkills: this.analysisResult.missing_skills || []
      }
    ];
  }

  // =========================================
  // HISTORY
  // =========================================
  selectHistoryItem(item: any) {
    this.analysisResult = item.analysis;
  }

  deleteHistoryItem(event: Event, id: number) {
    event.stopPropagation();
    this.historyList = this.historyList.filter(x => x.id !== id);
  }

  // =========================================
  // SKILLS
  // =========================================
  addSkill() {

    if (this.newSkillInput.trim()) {

      this.userSkills.push(
        this.newSkillInput.trim()
      );

      this.newSkillInput = '';
    }
  }

  removeSkill(skill: string) {
    this.userSkills =
      this.userSkills.filter(s => s !== skill);
  }

  // =========================================
  // REWRITE
  // =========================================
  getRewrite() {

    if (!this.analysisResult) return;

    this.rewriting = true;

    this.http.post<any>(
      'http://127.0.0.1:10000/rewrite',
      {
        resume_text: this.analysisResult.extracted_text,
        job_description: this.jobDescription
      }

    ).subscribe({

      next: (res) => {
        this.rewriteResult = res;
        this.rewriting = false;
      },

      error: () => {
        this.rewriting = false;
      }
    });
  }

  // =========================================
  // INTERVIEW QUESTIONS
  // =========================================
  getInterviewQuestions() {

    if (!this.analysisResult) return;

    this.loadingInterview = true;

    this.http.post<any>(
      'http://127.0.0.1:10000/interview-prep',
      {
        role: this.analysisResult.best_suited_role,
        resume_text: this.analysisResult.extracted_text
      }

    ).subscribe({

      next: (res) => {
        this.interviewPrepList = res.questions || [];
        this.loadingInterview = false;
      },

      error: () => {
        this.loadingInterview = false;
      }
    });
  }

  toggleInterviewQuestion(i: number) {
    this.activeInterviewQuestion =
      this.activeInterviewQuestion === i ? null : i;
  }

  // =========================================
  // AUTH
  // =========================================
  openAuth(mode: 'login' | 'signup') {
    this.authMode = mode;
    this.showAuthModal = true;
  }

  closeAuth() {
    this.showAuthModal = false;
  }

  handleAuthSubmit() {

    this.currentUser = {
      name: this.authName || 'User',
      username: this.authUsername
    };

    this.closeAuth();
  }

  logout() {
    this.currentUser = null;
  }

  // =========================================
  // UI
  // =========================================
  toggleDarkMode() {

    this.isDarkMode = !this.isDarkMode;

    document.body.classList.toggle(
      'dark',
      this.isDarkMode
    );
  }

  downloadPDF() {
    window.print();
  }
}