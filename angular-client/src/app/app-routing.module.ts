import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

export const routes: Routes = [
  { 
    path: '', 
    loadComponent: () => import('./components/onboarding/onboarding.component').then(m => m.OnboardingComponent)
  },
  { 
    path: 'progress', 
    loadComponent: () => import('./components/progress/progress.component').then(m => m.ProgressComponent)
  },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { } 