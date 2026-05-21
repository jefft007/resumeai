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
  private baseUrl = 'https://resumeai-2ai9.onrender.com';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private analysisResultSubject = new BehaviorSubject<any | null>(null);
  public analysisResult$ = this.analysisResultSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    try {
      const storedUser = localStorage.getItem('resume_user');
      if (storedUser) {
        this.currentUserSubject.next(JSON.parse(storedUser));
      }
    } catch {
      localStorage.removeItem('resume_user');
    }
  }

  // =====================
  // ANALYZE
  // =====================
  analyzeResume(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('resume', file);

    return this.http.post(`${this.baseUrl}/analyze`, formData).pipe(
      tap(res => this.analysisResultSubject.next(res)),
      catchError(err => throwError(() => err))
    );
  }

  // =====================
  // REWRITE
  // =====================
  rewriteResume(resumeText: string, jobDescription: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/rewrite`, {
      resume_text: resumeText,
      job_description: jobDescription
    });
  }

  // =====================
  // INTERVIEW PREP
  // =====================
  interviewPrep(resumeText: string, role: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/interview-prep`, {
      resume_text: resumeText,
      role
    });
  }
}