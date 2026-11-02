import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { HrService, HrPolicySettingsDto } from '../../../core/services/hr.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-hr-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './hr-settings.component.html',
  styleUrls: ['./hr-settings.component.scss']
})
export class HrSettingsComponent implements OnInit {
  public langService = inject(LanguageService);
  private hrService = inject(HrService);

  loading = false;
  saving = false;

  get isArabic(): boolean {
    return this.langService.isArabic();
  }

  settings: HrPolicySettingsDto = {
    id: '',
    companyId: '',
    maxAdvanceSalaryPercentage: 100,
    maxAdvanceInstallments: 6,
    requireManagerApprovalForAdvance: true,
    autoDeductFromPayroll: true,
    autoNotifyReturnCustodyBeforeDays: 7,
    blockExitClearanceIfCustodyActive: true
  };

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.loading = true;
    this.hrService.getHrSettings().subscribe({
      next: (data) => {
        this.settings = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: this.langService.t('hr.settings.alerts.loadErrorTitle'),
          text: this.langService.t('hr.settings.alerts.loadErrorText')
        });
      }
    });
  }

  saveSettings(): void {
    this.saving = true;
    this.hrService.updateHrSettings(this.settings).subscribe({
      next: (updated) => {
        this.saving = false;
        this.settings = updated;
        Swal.fire({
          icon: 'success',
          title: this.langService.t('hr.settings.alerts.saveSuccessTitle'),
          text: this.langService.t('hr.settings.alerts.saveSuccessText'),
          confirmButtonColor: '#059669'
        });
      },
      error: (err) => {
        this.saving = false;
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: this.langService.t('hr.settings.alerts.saveErrorTitle'),
          text: err.error?.message || this.langService.t('hr.settings.alerts.saveErrorDefault')
        });
      }
    });
  }
}
