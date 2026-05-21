import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

export interface User {
  username: string;
  name: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  logo: string;
  location: string;
  salary: string;
  skills: string[];
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class ResumeService {

  // ✅ BASE URL (Render backend)
  private baseUrl = 'https://resumeai-p1zf.onrender.com';

  // =====================
  // STATE MANAGEMENT
  // =====================
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private analysisResultSubject = new BehaviorSubject<any | null>(null);
  public analysisResult$ = this.analysisResultSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  // =====================
  // INIT USER
  // =====================
  private loadUserFromStorage(): void {
    try {
      const storedUser = localStorage.getItem('resume_user');
      if (storedUser) {
        this.currentUserSubject.next(JSON.parse(storedUser));
      }
    } catch (err) {
      localStorage.removeItem('resume_user');
    }
  }

  // =====================
  // 🔥 ANALYZE RESUME API
  // =====================
  analyzeResume(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('resume', file);

    return this.http.post<any>(`${this.baseUrl}/analyze`, formData).pipe(
      tap(result => {
        this.analysisResultSubject.next(result);

        const user = this.currentUserSubject.value;
        if (user) {
          this.saveToHistory(file.name, result);
        }
      }),
      catchError(err => {
        console.error('Analyze API error:', err);
        return throwError(() => new Error('Failed to analyze resume'));
      })
    );
  }

  // =====================
  // ✏️ REWRITE RESUME API
  // =====================
  rewriteResume(resumeText: string, jobDescription: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/rewrite`, {
      resume_text: resumeText,
      job_description: jobDescription
    }).pipe(
      catchError(err => {
        console.error('Rewrite API error:', err);
        return throwError(() => new Error('Failed to rewrite resume'));
      })
    );
  }

  // =====================
  // 🎯 INTERVIEW PREP API
  // =====================
  interviewPrep(resumeText: string, role: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/interview-prep`, {
      resume_text: resumeText,
      role
    }).pipe(
      catchError(err => {
        console.error('Interview API error:', err);
        return throwError(() => new Error('Failed to generate interview questions'));
      })
    );
  }

  // =====================
  // 👤 AUTH SYSTEM
  // =====================
  login(username: string): Observable<User> {
    const users = this.getUsers();

    const found = users.find(
      (u: any) => u.username.trim().toLowerCase() === username.trim().toLowerCase()
    );

    if (!found) {
      return throwError(() => new Error('User not found. Please sign up first.'));
    }

    this.setUser(found);
    return of(found);
  }

  signup(username: string, name: string): Observable<User> {
    const users = this.getUsers();

    if (!users.find((u: any) => u.username === username)) {
      users.push({ username, name });
      localStorage.setItem('registered_users', JSON.stringify(users));
    }

    return this.login(username);
  }

  logout(): void {
    localStorage.removeItem('resume_user');
    this.currentUserSubject.next(null);
    this.analysisResultSubject.next(null);
  }

  setAnalysisResult(result: any): void {
    this.analysisResultSubject.next(result);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  private setUser(user: User): void {
    localStorage.setItem('resume_user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private getUsers(): any[] {
    return JSON.parse(localStorage.getItem('registered_users') || '[]');
  }

  // =====================
  // 📜 HISTORY SYSTEM
  // =====================
  saveToHistory(filename: string, analysis: any): void {
    const user = this.currentUserSubject.value;
    if (!user) return;

    const key = `history_${user.username}`;
    const history = JSON.parse(localStorage.getItem(key) || '[]');

    // prevent duplicate consecutive saves
    if (
      history.length > 0 &&
      history[0]?.analysis?.extracted_text === analysis?.extracted_text
    ) {
      return;
    }

    history.unshift({
      id: Date.now().toString(),
      filename,
      date: new Date().toLocaleString(),
      analysis
    });

    // keep only latest 10
    if (history.length > 10) history.pop();

    localStorage.setItem(key, JSON.stringify(history));
  }

  getHistory(): any[] {
    const user = this.currentUserSubject.value;
    if (!user) return [];

    const key = `history_${user.username}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  }

  deleteHistoryItem(id: string): void {
    const user = this.currentUserSubject.value;
    if (!user) return;

    const key = `history_${user.username}`;
    let history = JSON.parse(localStorage.getItem(key) || '[]');

    history = history.filter((h: any) => h.id !== id);

    localStorage.setItem(key, JSON.stringify(history));
  }

  // =====================
  // 💼 JOB MATCH ENGINE
  // =====================
  getRecommendedJobs(userSkills: string[]): any[] {
    if (!userSkills || userSkills.length === 0) return [];

    const skills = userSkills.map(s => s.toLowerCase());

    const jobs: Job[] = [
      {
        id: '1',
        title: 'Frontend Developer',
        company: 'TechVibe',
        logo: '💻',
        location: 'Remote',
        salary: '₹8-15 LPA',
        skills: ['Angular', 'TypeScript', 'CSS', 'JavaScript'],
        description: 'Build modern UI applications using Angular.'
      },
      {
        id: '2',
        title: 'Backend Developer',
        company: 'DataFlow',
        logo: '⚙️',
        location: 'Hybrid',
        salary: '₹10-18 LPA',
        skills: ['Python', 'Flask', 'API', 'SQL'],
        description: 'Develop scalable backend systems and APIs.'
      }
    ];

    return jobs
      .map(job => {
        const matched = job.skills.filter(s =>
          skills.some(us => us.includes(s.toLowerCase()))
        );

        const missing = job.skills.filter(s => !matched.includes(s));

        const matchScore = Math.round(
          (matched.length / job.skills.length) * 100
        );

        return {
          ...job,
          matchedSkills: matched,
          missingSkills: missing,
          matchScore
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }
}