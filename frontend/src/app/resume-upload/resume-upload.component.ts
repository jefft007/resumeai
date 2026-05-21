import { Component, OnInit } from '@angular/core';
import { ResumeService, User } from '../resume.service';

@Component({
  selector: 'app-resume-upload',
  templateUrl: './resume-upload.component.html',
  styleUrls: ['./resume-upload.component.css']
})
export class ResumeUploadComponent implements OnInit {

  activeTab: string = 'dashboard';

  selectedFile: File | null = null;
  isLoading = false;
  analysisResult: any = null;

  isDarkMode = false;

  showAuthModal = false;
  authMode: 'login' | 'signup' = 'login';
  authUsername = '';
  authName = '';
  currentUser: User | null = null;

  historyList: any[] = [];

  jobDescription: string = '';
  rewriting = false;
  rewriteResult: any = null;

  interviewPrepList: any[] = [];
  loadingInterview = false;
  activeInterviewQuestion: number | null = null;

  userSkills: string[] = [];
  newSkillInput = '';
  recommendedJobs: any[] = [];

  constructor(private resumeService: ResumeService) {}

  ngOnInit(): void {

    // Theme
    this.isDarkMode = localStorage.getItem('theme') === 'dark';
    this.applyTheme();

    // User
    this.resumeService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.historyList = user ? this.resumeService.getHistory() : [];
    });

    // Analysis result
    this.resumeService.analysisResult$.subscribe(result => {
      this.analysisResult = result;

      if (result) {
        this.userSkills = result?.detected_skills ? [...result.detected_skills] : [];
        this.updateJobRecommendations();
        this.rewriteResult = null;
        this.interviewPrepList = [];
      } else {
        this.userSkills = [];
        this.recommendedJobs = [];
      }
    });
  }

  // ================= FILE =================
  onFileSelected(event: any): void {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Only PDF allowed');
      return;
    }

    this.selectedFile = file;
  }

  uploadResume(): void {
    if (!this.selectedFile) {
      alert('Select a PDF first');
      return;
    }

    this.isLoading = true;

    this.resumeService.analyzeResume(this.selectedFile).subscribe({
      next: () => {
        this.isLoading = false;
        this.historyList = this.resumeService.getHistory();
      },
      error: (err) => {
        console.error(err);
        alert('Backend error / API not reachable');
        this.isLoading = false;
      }
    });
  }

  // ================= THEME =================
  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
    this.applyTheme();
  }

  applyTheme(): void {
    document.documentElement.classList.toggle('dark', this.isDarkMode);
  }

  // ================= AUTH =================
  openAuth(mode: 'login' | 'signup') {
    this.authMode = mode;
    this.authUsername = '';
    this.authName = '';
    this.showAuthModal = true;
  }

  closeAuth() {
    this.showAuthModal = false;
  }

  handleAuthSubmit(): void {
    if (!this.authUsername.trim()) {
      alert('Enter username');
      return;
    }

    if (this.authMode === 'login') {
      this.resumeService.login(this.authUsername).subscribe({
        next: () => this.closeAuth(),
        error: (e) => alert(e.message)
      });
    } else {
      if (!this.authName.trim()) {
        alert('Enter name');
        return;
      }

      this.resumeService.signup(this.authUsername, this.authName).subscribe({
        next: () => this.closeAuth()
      });
    }
  }

  logout(): void {
    this.resumeService.logout();
    this.selectedFile = null;
    this.analysisResult = null;
    this.activeTab = 'dashboard';
  }

  // ================= HISTORY =================
  loadHistory(): void {
    this.historyList = this.resumeService.getHistory();
  }

  selectHistoryItem(item: any): void {
    this.resumeService.setAnalysisResult(item.analysis);
    this.activeTab = 'dashboard';
  }

  deleteHistoryItem(event: Event, id: string): void {
    event.stopPropagation();
    this.resumeService.deleteHistoryItem(id);
    this.loadHistory();
  }

  // ================= SKILLS =================
  addSkill(): void {
    const skill = this.newSkillInput.trim();
    if (!skill) return;

    if (!this.userSkills.includes(skill)) {
      this.userSkills.push(skill);
      this.updateJobRecommendations();
    }

    this.newSkillInput = '';
  }

  removeSkill(skill: string): void {
    this.userSkills = this.userSkills.filter(s => s !== skill);
    this.updateJobRecommendations();
  }

  updateJobRecommendations(): void {
    this.recommendedJobs = this.resumeService.getRecommendedJobs(this.userSkills);
  }

  // ================= AI FEATURES =================
  getInterviewQuestions(): void {
    if (!this.analysisResult?.extracted_text) return;

    this.loadingInterview = true;
    this.interviewPrepList = [];
    this.activeInterviewQuestion = null;

    this.resumeService.interviewPrep(
      this.analysisResult.extracted_text,
      this.analysisResult.best_suited_role || ''
    ).subscribe({
      next: (res) => {
        this.interviewPrepList = res?.questions || [];
        this.loadingInterview = false;
      },
      error: () => {
        alert('Interview API failed');
        this.loadingInterview = false;
      }
    });
  }

  toggleInterviewQuestion(index: number): void {
    this.activeInterviewQuestion =
      this.activeInterviewQuestion === index ? null : index;
  }

  getRewrite(): void {
    if (!this.analysisResult?.extracted_text || !this.jobDescription.trim()) {
      alert('Fill job description');
      return;
    }

    this.rewriting = true;
    this.rewriteResult = null;

    this.resumeService.rewriteResume(
      this.analysisResult.extracted_text,
      this.jobDescription
    ).subscribe({
      next: (res) => {
        this.rewriteResult = res;
        this.rewriting = false;
      },
      error: () => {
        alert('Rewrite failed');
        this.rewriting = false;
      }
    });
  }

  // ================= PDF =================
  downloadPDF(): void {
    window.print();
  }
}