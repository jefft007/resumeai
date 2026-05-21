import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, of } from 'rxjs';

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

  // ✅ Backend URL
  private baseUrl = 'https://resumeai-2ai9.onrender.com';

  // =====================
  // STATE MANAGEMENT
  // =====================
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  private analysisResultSubject = new BehaviorSubject<any | null>(null);
  analysisResult$ = this.analysisResultSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  // =====================
  // LOCAL STORAGE
  // =====================
  private loadUserFromStorage(): void {
    try {
      const storedUser = localStorage.getItem('resume_user');

      if (storedUser) {
        const user: User = JSON.parse(storedUser);
        this.currentUserSubject.next(user);
      }
    } catch (err) {
      console.error('Invalid stored user, clearing storage');
      localStorage.removeItem('resume_user');
    }
  }

  setUser(user: User): void {
    this.currentUserSubject.next(user);
    localStorage.setItem('resume_user', JSON.stringify(user));
  }

  logout(): void {
    this.currentUserSubject.next(null);
    localStorage.removeItem('resume_user');
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // =====================
  // RESUME ANALYSIS
  // =====================
  analyzeResume(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('resume', file);

    return this.http.post<any>(`${this.baseUrl}/analyze`, formData).pipe(
      tap(result => this.analysisResultSubject.next(result)),
      catchError(err => {
        console.error('Analyze Resume Error:', err);
        return of(null);
      })
    );
  }

  // =====================
  // REWRITE RESUME
  // =====================
  rewriteResume(resumeText: string, jobDescription: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/rewrite`, {
      resume_text: resumeText,
      job_description: jobDescription
    }).pipe(
      catchError(err => {
        console.error('Rewrite Error:', err);
        return of(null);
      })
    );
  }

  // =====================
  // INTERVIEW PREP
  // =====================
  interviewPrep(resumeText: string, role: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/interview-prep`, {
      resume_text: resumeText,
      role: role
    }).pipe(
      catchError(err => {
        console.error('Interview Prep Error:', err);
        return of(null);
      })
    );
  }

  // =====================
  // UPDATE ANALYSIS MANUALLY (optional)
  // =====================
  setAnalysisResult(result: any): void {
    this.analysisResultSubject.next(result);
  }

  getAnalysisResult(): any {
    return this.analysisResultSubject.value;
  }
}