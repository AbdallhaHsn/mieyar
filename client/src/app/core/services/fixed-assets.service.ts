import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export enum DepreciationMethod {
  StraightLine = 1,
  DecliningBalance = 2
}

export enum FixedAssetStatus {
  Active = 1,
  FullyDepreciated = 2,
  Disposed = 3
}

export interface AssetDepreciationHistoryDto {
  id: string;
  depreciationDate: string;
  periodNumber: number;
  fiscalYear: number;
  depreciationAmount: number;
  bookValueBefore: number;
  bookValueAfter: number;
  journalEntryId?: string;
  journalEntryNumber?: string;
  createdAtUtc: string;
  createdBy: string;
}

export interface FixedAssetDto {
  id: string;
  assetCode: string;
  nameAr: string;
  nameEn: string;
  assetAccountId: string;
  assetAccountCode: string;
  assetAccountNameAr: string;
  accumulatedDepreciationAccountId: string;
  accumulatedDepreciationAccountCode: string;
  accumulatedDepreciationAccountNameAr: string;
  depreciationExpenseAccountId: string;
  depreciationExpenseAccountCode: string;
  depreciationExpenseAccountNameAr: string;
  costCenterId?: string;
  costCenterNameAr?: string;
  purchaseDate: string;
  depreciationStartDate: string;
  acquisitionCost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  depreciationMethod: DepreciationMethod;
  depreciationMethodNameAr: string;
  depreciationRate: number;
  currentBookValue: number;
  totalAccumulatedDepreciation: number;
  lastDepreciationDate?: string;
  status: FixedAssetStatus;
  statusNameAr: string;
  serialNumber?: string;
  location?: string;
  notes?: string;
  monthlyDepreciationAmount: number;
  histories: AssetDepreciationHistoryDto[];
}

export interface CreateFixedAssetRequest {
  companyId?: string;
  nameAr: string;
  nameEn?: string;
  assetAccountId: string;
  accumulatedDepreciationAccountId: string;
  depreciationExpenseAccountId: string;
  costCenterId?: string;
  purchaseDate: string;
  depreciationStartDate?: string;
  acquisitionCost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  depreciationMethod: DepreciationMethod;
  depreciationRate: number;
  serialNumber?: string;
  location?: string;
  notes?: string;
}

export interface DepreciationPreviewItemDto {
  assetId: string;
  assetCode: string;
  nameAr: string;
  acquisitionCost: number;
  currentBookValue: number;
  monthlyDepreciationAmount: number;
  newBookValue: number;
  expenseAccountCode: string;
  expenseAccountNameAr: string;
  accumAccountCode: string;
  accumAccountNameAr: string;
}

export interface DepreciationPreviewDto {
  targetDate: string;
  eligibleAssetsCount: number;
  totalDepreciationAmount: number;
  items: DepreciationPreviewItemDto[];
}

export interface RunDepreciationRequest {
  companyId?: string;
  depreciationDate: string;
  notes?: string;
}

export interface RunDepreciationResultDto {
  journalEntryId: string;
  journalEntryNumber: string;
  depreciationDate: string;
  depreciatedAssetsCount: number;
  totalDepreciationAmount: number;
  message: string;
}

export interface DisposeFixedAssetRequest {
  companyId?: string;
  disposalDate: string;
  salePrice: number;
  proceedsAccountId?: string;
  gainLossAccountId?: string;
  reason: string;
  notes?: string;
}

export interface DisposeFixedAssetResultDto {
  assetId: string;
  assetCode: string;
  nameAr: string;
  acquisitionCost: number;
  totalAccumulatedDepreciation: number;
  bookValueAtDisposal: number;
  salePrice: number;
  gainOrLossAmount: number;
  isGain: boolean;
  journalEntryId?: string;
  journalEntryNumber?: string;
  message: string;
}

export interface FixedAssetFinancialReportDto {
  companyId: string;
  asOfDate: string;
  fiscalYear?: number;
  totals: FixedAssetReportTotalsDto;
  categories: FixedAssetCategorySummaryDto[];
  movementSchedule: FixedAssetMovementCategoryDto[];
  disposals: FixedAssetDisposalReportItemDto[];
}

export interface FixedAssetReportTotalsDto {
  totalAssetsCount: number;
  activeCount: number;
  fullyDepreciatedCount: number;
  disposedCount: number;
  totalAcquisitionCost: number;
  totalSalvageValue: number;
  totalAccumulatedDepreciation: number;
  totalNetBookValue: number;
  totalPeriodDepreciation: number;
  totalGainsOnDisposals: number;
  totalLossesOnDisposals: number;
}

export interface FixedAssetCategorySummaryDto {
  assetAccountId: string;
  accountCode: string;
  accountNameAr: string;
  assetCount: number;
  totalCost: number;
  totalSalvage: number;
  totalAccumulated: number;
  netBookValue: number;
  depreciationRatioPercent: number;
  assets: FixedAssetDto[];
}

export interface FixedAssetMovementCategoryDto {
  categoryNameAr: string;
  accountCode: string;
  openingCost: number;
  additionsCost: number;
  disposalsCost: number;
  closingCost: number;
  openingAccumulated: number;
  periodDepreciation: number;
  disposalsAccumulated: number;
  closingAccumulated: number;
  openingBookValue: number;
  closingBookValue: number;
}

export interface FixedAssetDisposalReportItemDto {
  assetId: string;
  assetCode: string;
  nameAr: string;
  nameEn: string;
  disposalDate?: string;
  reason?: string;
  acquisitionCost: number;
  accumulatedDepreciationAtDisposal: number;
  bookValueAtDisposal: number;
  salePrice: number;
  gainOrLossAmount: number;
  isGain: boolean;
  journalEntryNumber?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FixedAssetsService {
  private readonly baseUrl = `${environment.apiUrl}/api/fixed-assets`;

  constructor(private http: HttpClient) {}

  getAssets(companyId?: string, status?: FixedAssetStatus, searchTerm?: string): Observable<FixedAssetDto[]> {
    let params = new HttpParams();
    if (companyId) params = params.set('companyId', companyId);
    if (status) params = params.set('status', status.toString());
    if (searchTerm) params = params.set('searchTerm', searchTerm);
    return this.http.get<FixedAssetDto[]>(this.baseUrl, { params });
  }

  getFinancialReport(companyId?: string, asOfDate?: string, fiscalYear?: number): Observable<FixedAssetFinancialReportDto> {
    let params = new HttpParams();
    if (companyId) params = params.set('companyId', companyId);
    if (asOfDate) params = params.set('asOfDate', asOfDate);
    if (fiscalYear) params = params.set('fiscalYear', fiscalYear.toString());
    return this.http.get<FixedAssetFinancialReportDto>(`${this.baseUrl}/financial-report`, { params });
  }

  createAsset(request: CreateFixedAssetRequest): Observable<FixedAssetDto> {
    return this.http.post<FixedAssetDto>(this.baseUrl, request);
  }

  previewDepreciation(companyId?: string, targetDate?: string): Observable<DepreciationPreviewDto> {
    let params = new HttpParams();
    if (companyId) params = params.set('companyId', companyId);
    if (targetDate) params = params.set('targetDate', targetDate);
    return this.http.get<DepreciationPreviewDto>(`${this.baseUrl}/depreciation-preview`, { params });
  }

  runDepreciation(request: RunDepreciationRequest): Observable<RunDepreciationResultDto> {
    return this.http.post<RunDepreciationResultDto>(`${this.baseUrl}/run-depreciation`, request);
  }

  disposeAsset(id: string, request: DisposeFixedAssetRequest): Observable<DisposeFixedAssetResultDto> {
    return this.http.post<DisposeFixedAssetResultDto>(`${this.baseUrl}/${id}/dispose`, request);
  }
}

