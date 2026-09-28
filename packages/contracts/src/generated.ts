import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** An ISO-8601 UTC instant; calendar dates use YYYY-MM-DD strings. */
  DateTime: { input: string; output: string; }
  /** Exact decimal encoded as a string. Never a binary floating-point currency. */
  Decimal: { input: string; output: string; }
  JSON: { input: unknown; output: unknown; }
};

export type AccessAudit = {
  __typename?: 'AccessAudit';
  actorId: Scalars['ID']['output'];
  changes: Array<PermissionChange>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  reason: Scalars['String']['output'];
  version: Scalars['Int']['output'];
};

export type AccessChangeInput = {
  active: Scalars['Boolean']['input'];
  delegations: Array<DelegationInput>;
  expectedVersion: Scalars['Int']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
  role: Scalars['String']['input'];
  rules: Array<AccessRuleInput>;
};

export type AccessChangeResult = {
  __typename?: 'AccessChangeResult';
  changes: Array<PermissionChange>;
  version: Scalars['Int']['output'];
};

export type AccessDecision = {
  __typename?: 'AccessDecision';
  allowed: Scalars['Boolean']['output'];
  available?: Maybe<Scalars['Boolean']['output']>;
  rule: Scalars['String']['output'];
  scope: Scalars['String']['output'];
};

export type AccessRule = {
  __typename?: 'AccessRule';
  effect: Scalars['String']['output'];
  key: Scalars['String']['output'];
  scope: Scalars['String']['output'];
};

export type AccessRuleInput = {
  effect: Scalars['String']['input'];
  key: Scalars['String']['input'];
  scope: Scalars['String']['input'];
};

export type AccessUser = {
  __typename?: 'AccessUser';
  active: Scalars['Boolean']['output'];
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  protected: Scalars['Boolean']['output'];
  version: Scalars['Int']['output'];
};

export type AccessUsers = {
  __typename?: 'AccessUsers';
  canManage: Scalars['Boolean']['output'];
  isSuperAdmin: Scalars['Boolean']['output'];
  users: Array<AccessUser>;
};

export type Actor = {
  __typename?: 'Actor';
  id: Scalars['ID']['output'];
  permissionVersion: Scalars['Int']['output'];
};

export type AuditEntry = {
  __typename?: 'AuditEntry';
  action: Scalars['String']['output'];
  actorId: Scalars['ID']['output'];
  createdAt: Scalars['DateTime']['output'];
  entityId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  reason?: Maybe<Scalars['String']['output']>;
};

export type Bootstrap = {
  __typename?: 'Bootstrap';
  actor: Actor;
  organization: Organization;
  sites: Array<Site>;
};

export type Delegation = {
  __typename?: 'Delegation';
  key: Scalars['String']['output'];
  scope: Scalars['String']['output'];
};

export type DelegationInput = {
  key: Scalars['String']['input'];
  scope: Scalars['String']['input'];
};

export type EffectivePermission = {
  __typename?: 'EffectivePermission';
  decision: AccessDecision;
  key: Scalars['String']['output'];
};

export type Employee = {
  __typename?: 'Employee';
  allowedActions: Array<Scalars['String']['output']>;
  assignments: Array<SiteAssignment>;
  bank?: Maybe<Scalars['String']['output']>;
  department?: Maybe<Scalars['String']['output']>;
  displayName: Scalars['String']['output'];
  employeeCode: Scalars['String']['output'];
  employment: Array<Employment>;
  id: Scalars['ID']['output'];
  identity?: Maybe<Scalars['String']['output']>;
  isSelf: Scalars['Boolean']['output'];
  jobTitle?: Maybe<Scalars['String']['output']>;
  /** Null unless the actor may manage this employee's account. */
  login?: Maybe<EmployeeLogin>;
  permittedFields: Array<Scalars['String']['output']>;
  personal?: Maybe<EmployeePersonal>;
  phone?: Maybe<Scalars['String']['output']>;
  photoUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  salary?: Maybe<Scalars['Decimal']['output']>;
  /** active | joining | moved | former at the selected site; null without the employment field. */
  status?: Maybe<Scalars['String']['output']>;
  userId?: Maybe<Scalars['ID']['output']>;
  version: Scalars['Int']['output'];
  workEmail?: Maybe<Scalars['String']['output']>;
};

export type EmployeeDetails = {
  __typename?: 'EmployeeDetails';
  reporting: Array<ReportingAssignment>;
  shift?: Maybe<EmployeeShift>;
};

export type EmployeeDraft = {
  __typename?: 'EmployeeDraft';
  authorId: Scalars['ID']['output'];
  createdAt: Scalars['DateTime']['output'];
  department: Scalars['String']['output'];
  designation: Scalars['String']['output'];
  displayName: Scalars['String']['output'];
  employeeCode: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  startsOn: Scalars['String']['output'];
  status: Scalars['String']['output'];
  version: Scalars['Int']['output'];
  workEmail: Scalars['String']['output'];
};

export type EmployeeLifecycleInput = {
  employeeId: Scalars['ID']['input'];
  expectedVersion: Scalars['Int']['input'];
  legalEmployerId?: InputMaybe<Scalars['ID']['input']>;
  /** set_password only: 8–128 characters; omitted generates one. */
  password?: InputMaybe<Scalars['String']['input']>;
  startsOn?: InputMaybe<Scalars['String']['input']>;
};

export type EmployeeLifecycleResult = {
  __typename?: 'EmployeeLifecycleResult';
  id: Scalars['ID']['output'];
  /** Temporary password, returned once by set_password. */
  password?: Maybe<Scalars['String']['output']>;
  version: Scalars['Int']['output'];
};

export type EmployeeLogin = {
  __typename?: 'EmployeeLogin';
  devices: Scalars['Int']['output'];
  lastSignInAt?: Maybe<Scalars['DateTime']['output']>;
  loginId?: Maybe<Scalars['String']['output']>;
  /** Privileged accounts are managed through Users & access, never here. */
  protected: Scalars['Boolean']['output'];
  /** none | pending | active | disabled */
  status: Scalars['String']['output'];
};

export type EmployeePage = {
  __typename?: 'EmployeePage';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  nodes: Array<Employee>;
};

export type EmployeePersonal = {
  __typename?: 'EmployeePersonal';
  address?: Maybe<Scalars['String']['output']>;
  bloodGroup?: Maybe<Scalars['String']['output']>;
  dateOfBirth?: Maybe<Scalars['String']['output']>;
  emergencyName?: Maybe<Scalars['String']['output']>;
  emergencyPhone?: Maybe<Scalars['String']['output']>;
  emergencyRelation?: Maybe<Scalars['String']['output']>;
  gender?: Maybe<Scalars['String']['output']>;
  permanentAddress?: Maybe<Scalars['String']['output']>;
  personalEmail?: Maybe<Scalars['String']['output']>;
};

export type EmployeeShift = {
  __typename?: 'EmployeeShift';
  endTime?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  startTime?: Maybe<Scalars['String']['output']>;
};

export type Employment = {
  __typename?: 'Employment';
  endsOn?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  legalEmployer: LegalEmployer;
  startsOn: Scalars['String']['output'];
};

export type ExportJob = {
  __typename?: 'ExportJob';
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  status: Scalars['String']['output'];
};

export type FoundationData = {
  __typename?: 'FoundationData';
  drafts: Array<EmployeeDraft>;
  employers: Array<LegalEmployer>;
  managers: Array<ManagerOption>;
  references: Array<ReferenceItem>;
  settings: SiteSettings;
};

export type FoundationInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  approve?: InputMaybe<Scalars['Boolean']['input']>;
  assignmentId?: InputMaybe<Scalars['ID']['input']>;
  contactEmail?: InputMaybe<Scalars['String']['input']>;
  date?: InputMaybe<Scalars['String']['input']>;
  department?: InputMaybe<Scalars['String']['input']>;
  designation?: InputMaybe<Scalars['String']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  draftId?: InputMaybe<Scalars['ID']['input']>;
  employeeCode?: InputMaybe<Scalars['String']['input']>;
  employeeId?: InputMaybe<Scalars['ID']['input']>;
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  endTime?: InputMaybe<Scalars['String']['input']>;
  endsOn?: InputMaybe<Scalars['String']['input']>;
  expectedVersion?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  kind?: InputMaybe<Scalars['String']['input']>;
  legalEmployerId?: InputMaybe<Scalars['ID']['input']>;
  managerId?: InputMaybe<Scalars['ID']['input']>;
  moduleId?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
  reason?: InputMaybe<Scalars['String']['input']>;
  shiftId?: InputMaybe<Scalars['ID']['input']>;
  sourceSiteId?: InputMaybe<Scalars['ID']['input']>;
  startTime?: InputMaybe<Scalars['String']['input']>;
  startsOn?: InputMaybe<Scalars['String']['input']>;
  timezone?: InputMaybe<Scalars['String']['input']>;
  weekStart?: InputMaybe<Scalars['Int']['input']>;
  workEmail?: InputMaybe<Scalars['String']['input']>;
};

export type FoundationResult = {
  __typename?: 'FoundationResult';
  id?: Maybe<Scalars['ID']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  version?: Maybe<Scalars['Int']['output']>;
};

export type LegalEmployer = {
  __typename?: 'LegalEmployer';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type ManagerOption = {
  __typename?: 'ManagerOption';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  dwrCommand: Scalars['JSON']['output'];
  /** set_password | disable_login | enable_login | rehire */
  employeeLifecycle: EmployeeLifecycleResult;
  explainAnalytics: Scalars['JSON']['output'];
  hrCommand: Scalars['JSON']['output'];
  operate: Scalars['JSON']['output'];
  payrollCommand: Scalars['JSON']['output'];
  previewAccess: AccessChangeResult;
  queueExport: ExportJob;
  saveAccess: AccessChangeResult;
  saveFoundation: FoundationResult;
  trackingCommand: Scalars['JSON']['output'];
  updateProfile: Employee;
};


export type MutationDwrCommandArgs = {
  input: Scalars['JSON']['input'];
  operation: Scalars['String']['input'];
  siteId: Scalars['ID']['input'];
};


export type MutationEmployeeLifecycleArgs = {
  input: EmployeeLifecycleInput;
  operation: Scalars['String']['input'];
  siteId: Scalars['ID']['input'];
};


export type MutationExplainAnalyticsArgs = {
  input: Scalars['JSON']['input'];
  siteId: Scalars['ID']['input'];
};


export type MutationHrCommandArgs = {
  input: Scalars['JSON']['input'];
  operation: Scalars['String']['input'];
  siteId: Scalars['ID']['input'];
};


export type MutationOperateArgs = {
  input: Scalars['JSON']['input'];
  operation: Scalars['String']['input'];
  siteId: Scalars['ID']['input'];
};


export type MutationPayrollCommandArgs = {
  input: Scalars['JSON']['input'];
  operation: Scalars['String']['input'];
  siteId: Scalars['ID']['input'];
};


export type MutationPreviewAccessArgs = {
  input: AccessChangeInput;
  siteId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationQueueExportArgs = {
  fields: Array<Scalars['String']['input']>;
  siteId: Scalars['ID']['input'];
};


export type MutationSaveAccessArgs = {
  input: AccessChangeInput;
  siteId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationSaveFoundationArgs = {
  input: FoundationInput;
  operation: Scalars['String']['input'];
  siteId: Scalars['ID']['input'];
};


export type MutationTrackingCommandArgs = {
  input: Scalars['JSON']['input'];
  operation: Scalars['String']['input'];
  siteId: Scalars['ID']['input'];
};


export type MutationUpdateProfileArgs = {
  input: UpdateProfileInput;
  siteId: Scalars['ID']['input'];
};

export type Organization = {
  __typename?: 'Organization';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type OrganizationReport = {
  __typename?: 'OrganizationReport';
  readOnly: Scalars['Boolean']['output'];
  rule: Scalars['String']['output'];
  sites: Array<SiteReport>;
};

export type PermissionChange = {
  __typename?: 'PermissionChange';
  after: AccessDecision;
  before: AccessDecision;
  key: Scalars['String']['output'];
};

export type ProductModule = {
  __typename?: 'ProductModule';
  actions: Array<Scalars['String']['output']>;
  available: Scalars['Boolean']['output'];
  dependencies: Array<Scalars['String']['output']>;
  fields: Array<Scalars['String']['output']>;
  group: Scalars['String']['output'];
  hindi: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  phase: Scalars['Int']['output'];
};

export type ProfileRequest = {
  __typename?: 'ProfileRequest';
  createdAt: Scalars['DateTime']['output'];
  currentDetails?: Maybe<EmployeePersonal>;
  currentPhone?: Maybe<Scalars['String']['output']>;
  details?: Maybe<EmployeePersonal>;
  employeeId: Scalars['ID']['output'];
  employeeName: Scalars['String']['output'];
  hasPhoto: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  isSelf: Scalars['Boolean']['output'];
  phone: Scalars['String']['output'];
  reason: Scalars['String']['output'];
  reviewNote?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  version: Scalars['Int']['output'];
};

export type Query = {
  __typename?: 'Query';
  accessUsers: AccessUsers;
  analytics: Scalars['JSON']['output'];
  approvalQueue: Scalars['JSON']['output'];
  attendanceReview: Scalars['JSON']['output'];
  auditHistory: Array<AuditEntry>;
  bootstrap: Bootstrap;
  dashboard: Scalars['JSON']['output'];
  dwr: Scalars['JSON']['output'];
  dwrChat: Scalars['JSON']['output'];
  employee?: Maybe<Employee>;
  employeeDetails: EmployeeDetails;
  employeeLookup: Scalars['JSON']['output'];
  employees: EmployeePage;
  exportJob: ExportJob;
  foundation: FoundationData;
  hrRecords: Scalars['JSON']['output'];
  myProfile?: Maybe<Employee>;
  operations: Scalars['JSON']['output'];
  organizationReport: OrganizationReport;
  payroll: Scalars['JSON']['output'];
  profileRequests: Array<ProfileRequest>;
  roleMatrix: Scalars['JSON']['output'];
  scope: Scope;
  trackingContext: Scalars['JSON']['output'];
  trackingMonitor: Scalars['JSON']['output'];
  userAccess: UserAccess;
};


export type QueryAccessUsersArgs = {
  search?: InputMaybe<Scalars['String']['input']>;
  siteId: Scalars['ID']['input'];
};


export type QueryAnalyticsArgs = {
  input: Scalars['JSON']['input'];
  siteId: Scalars['ID']['input'];
};


export type QueryApprovalQueueArgs = {
  siteId: Scalars['ID']['input'];
};


export type QueryAttendanceReviewArgs = {
  siteId: Scalars['ID']['input'];
  workDate: Scalars['String']['input'];
};


export type QueryAuditHistoryArgs = {
  siteId: Scalars['ID']['input'];
};


export type QueryDashboardArgs = {
  siteId: Scalars['ID']['input'];
};


export type QueryDwrArgs = {
  siteId: Scalars['ID']['input'];
  workDate?: InputMaybe<Scalars['String']['input']>;
};


export type QueryDwrChatArgs = {
  input: Scalars['JSON']['input'];
  siteId: Scalars['ID']['input'];
};


export type QueryEmployeeArgs = {
  id: Scalars['ID']['input'];
  siteId: Scalars['ID']['input'];
};


export type QueryEmployeeDetailsArgs = {
  employeeId: Scalars['ID']['input'];
  siteId: Scalars['ID']['input'];
};


export type QueryEmployeeLookupArgs = {
  search: Scalars['String']['input'];
  siteId: Scalars['ID']['input'];
};


export type QueryEmployeesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  department?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  siteId: Scalars['ID']['input'];
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryExportJobArgs = {
  id: Scalars['ID']['input'];
  siteId: Scalars['ID']['input'];
};


export type QueryFoundationArgs = {
  siteId: Scalars['ID']['input'];
};


export type QueryHrRecordsArgs = {
  kind: Scalars['String']['input'];
  siteId: Scalars['ID']['input'];
};


export type QueryMyProfileArgs = {
  siteId: Scalars['ID']['input'];
};


export type QueryOperationsArgs = {
  siteId: Scalars['ID']['input'];
};


export type QueryOrganizationReportArgs = {
  siteId: Scalars['ID']['input'];
};


export type QueryPayrollArgs = {
  input?: InputMaybe<Scalars['JSON']['input']>;
  siteId: Scalars['ID']['input'];
};


export type QueryProfileRequestsArgs = {
  siteId: Scalars['ID']['input'];
};


export type QueryRoleMatrixArgs = {
  siteId: Scalars['ID']['input'];
};


export type QueryScopeArgs = {
  siteId: Scalars['ID']['input'];
};


export type QueryTrackingContextArgs = {
  siteId: Scalars['ID']['input'];
};


export type QueryTrackingMonitorArgs = {
  input: Scalars['JSON']['input'];
  siteId: Scalars['ID']['input'];
};


export type QueryUserAccessArgs = {
  siteId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type ReferenceItem = {
  __typename?: 'ReferenceItem';
  active: Scalars['Boolean']['output'];
  date?: Maybe<Scalars['String']['output']>;
  endTime?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  kind: Scalars['String']['output'];
  name: Scalars['String']['output'];
  startTime?: Maybe<Scalars['String']['output']>;
  version: Scalars['Int']['output'];
};

export type ReportingAssignment = {
  __typename?: 'ReportingAssignment';
  endsOn?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  managerId: Scalars['ID']['output'];
  managerName: Scalars['String']['output'];
  startsOn: Scalars['String']['output'];
};

export type Scope = {
  __typename?: 'Scope';
  capabilities: Array<Scalars['String']['output']>;
  decisions: Array<EffectivePermission>;
  modules: Array<ProductModule>;
  site: Site;
  workDate: Scalars['String']['output'];
};

export type Site = {
  __typename?: 'Site';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  timezone: Scalars['String']['output'];
};

export type SiteAssignment = {
  __typename?: 'SiteAssignment';
  endsOn?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  site: Site;
  startsOn: Scalars['String']['output'];
};

export type SiteReport = {
  __typename?: 'SiteReport';
  employees: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  timezone: Scalars['String']['output'];
};

export type SiteSettings = {
  __typename?: 'SiteSettings';
  contactEmail: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  timezone: Scalars['String']['output'];
  version: Scalars['Int']['output'];
  weekStart: Scalars['Int']['output'];
};

export type UpdateProfileInput = {
  employeeId: Scalars['ID']['input'];
  expectedVersion: Scalars['Int']['input'];
  phone: Scalars['String']['input'];
};

export type UserAccess = {
  __typename?: 'UserAccess';
  active: Scalars['Boolean']['output'];
  audit: Array<AccessAudit>;
  delegations: Array<Delegation>;
  effective: Array<EffectivePermission>;
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  protected: Scalars['Boolean']['output'];
  role: Scalars['String']['output'];
  rules: Array<AccessRule>;
  sites: Array<UserSite>;
  version: Scalars['Int']['output'];
};

export type UserSite = {
  __typename?: 'UserSite';
  active: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type BootstrapQueryVariables = Exact<{ [key: string]: never; }>;


export type BootstrapQuery = { __typename?: 'Query', bootstrap: { __typename?: 'Bootstrap', organization: { __typename?: 'Organization', id: string, name: string }, actor: { __typename?: 'Actor', id: string, permissionVersion: number }, sites: Array<{ __typename?: 'Site', id: string, name: string, timezone: string }> } };

export type SiteScopeQueryVariables = Exact<{
  siteId: Scalars['ID']['input'];
}>;


export type SiteScopeQuery = { __typename?: 'Query', scope: { __typename?: 'Scope', capabilities: Array<string>, workDate: string, site: { __typename?: 'Site', id: string, name: string, timezone: string }, modules: Array<{ __typename?: 'ProductModule', id: string, name: string, hindi: string, group: string, phase: number, available: boolean, actions: Array<string>, fields: Array<string>, dependencies: Array<string> }>, decisions: Array<{ __typename?: 'EffectivePermission', key: string, decision: { __typename?: 'AccessDecision', allowed: boolean, scope: string, rule: string, available?: boolean | null } }> } };

export type PersonalFieldsFragment = { __typename?: 'EmployeePersonal', dateOfBirth?: string | null, gender?: string | null, bloodGroup?: string | null, personalEmail?: string | null, address?: string | null, permanentAddress?: string | null, emergencyName?: string | null, emergencyRelation?: string | null, emergencyPhone?: string | null };

export type EmployeeFieldsFragment = { __typename?: 'Employee', userId?: string | null, allowedActions: Array<string>, permittedFields: Array<string>, salary?: string | null, bank?: string | null, identity?: string | null, id: string, employeeCode: string, displayName: string, workEmail?: string | null, phone?: string | null, photoUpdatedAt?: string | null, jobTitle?: string | null, department?: string | null, version: number, isSelf: boolean, personal?: { __typename?: 'EmployeePersonal', dateOfBirth?: string | null, gender?: string | null, bloodGroup?: string | null, personalEmail?: string | null, address?: string | null, permanentAddress?: string | null, emergencyName?: string | null, emergencyRelation?: string | null, emergencyPhone?: string | null } | null, employment: Array<{ __typename?: 'Employment', id: string, startsOn: string, endsOn?: string | null, legalEmployer: { __typename?: 'LegalEmployer', id: string, name: string } }>, assignments: Array<{ __typename?: 'SiteAssignment', id: string, startsOn: string, endsOn?: string | null, site: { __typename?: 'Site', id: string, name: string, timezone: string } }> };

export type EmployeesQueryVariables = Exact<{
  siteId: Scalars['ID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  department?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
}>;


export type EmployeesQuery = { __typename?: 'Query', employees: { __typename?: 'EmployeePage', endCursor?: string | null, hasNextPage: boolean, nodes: Array<{ __typename?: 'Employee', userId?: string | null, allowedActions: Array<string>, permittedFields: Array<string>, salary?: string | null, bank?: string | null, identity?: string | null, id: string, employeeCode: string, displayName: string, workEmail?: string | null, phone?: string | null, photoUpdatedAt?: string | null, jobTitle?: string | null, department?: string | null, version: number, isSelf: boolean, status?: string | null, personal?: { __typename?: 'EmployeePersonal', dateOfBirth?: string | null, gender?: string | null, bloodGroup?: string | null, personalEmail?: string | null, address?: string | null, permanentAddress?: string | null, emergencyName?: string | null, emergencyRelation?: string | null, emergencyPhone?: string | null } | null, employment: Array<{ __typename?: 'Employment', id: string, startsOn: string, endsOn?: string | null, legalEmployer: { __typename?: 'LegalEmployer', id: string, name: string } }>, assignments: Array<{ __typename?: 'SiteAssignment', id: string, startsOn: string, endsOn?: string | null, site: { __typename?: 'Site', id: string, name: string, timezone: string } }>, login?: { __typename?: 'EmployeeLogin', status: string, loginId?: string | null, lastSignInAt?: string | null, devices: number, protected: boolean } | null }> } };

export type EmployeeAdminFieldsFragment = { __typename?: 'Employee', status?: string | null, login?: { __typename?: 'EmployeeLogin', status: string, loginId?: string | null, lastSignInAt?: string | null, devices: number, protected: boolean } | null };

export type EmployeeRecordQueryVariables = Exact<{
  siteId: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
}>;


export type EmployeeRecordQuery = { __typename?: 'Query', employee?: { __typename?: 'Employee', userId?: string | null, allowedActions: Array<string>, permittedFields: Array<string>, salary?: string | null, bank?: string | null, identity?: string | null, id: string, employeeCode: string, displayName: string, workEmail?: string | null, phone?: string | null, photoUpdatedAt?: string | null, jobTitle?: string | null, department?: string | null, version: number, isSelf: boolean, status?: string | null, personal?: { __typename?: 'EmployeePersonal', dateOfBirth?: string | null, gender?: string | null, bloodGroup?: string | null, personalEmail?: string | null, address?: string | null, permanentAddress?: string | null, emergencyName?: string | null, emergencyRelation?: string | null, emergencyPhone?: string | null } | null, employment: Array<{ __typename?: 'Employment', id: string, startsOn: string, endsOn?: string | null, legalEmployer: { __typename?: 'LegalEmployer', id: string, name: string } }>, assignments: Array<{ __typename?: 'SiteAssignment', id: string, startsOn: string, endsOn?: string | null, site: { __typename?: 'Site', id: string, name: string, timezone: string } }>, login?: { __typename?: 'EmployeeLogin', status: string, loginId?: string | null, lastSignInAt?: string | null, devices: number, protected: boolean } | null } | null };

export type MyProfileQueryVariables = Exact<{
  siteId: Scalars['ID']['input'];
}>;


export type MyProfileQuery = { __typename?: 'Query', myProfile?: { __typename?: 'Employee', userId?: string | null, allowedActions: Array<string>, permittedFields: Array<string>, salary?: string | null, bank?: string | null, identity?: string | null, id: string, employeeCode: string, displayName: string, workEmail?: string | null, phone?: string | null, photoUpdatedAt?: string | null, jobTitle?: string | null, department?: string | null, version: number, isSelf: boolean, personal?: { __typename?: 'EmployeePersonal', dateOfBirth?: string | null, gender?: string | null, bloodGroup?: string | null, personalEmail?: string | null, address?: string | null, permanentAddress?: string | null, emergencyName?: string | null, emergencyRelation?: string | null, emergencyPhone?: string | null } | null, employment: Array<{ __typename?: 'Employment', id: string, startsOn: string, endsOn?: string | null, legalEmployer: { __typename?: 'LegalEmployer', id: string, name: string } }>, assignments: Array<{ __typename?: 'SiteAssignment', id: string, startsOn: string, endsOn?: string | null, site: { __typename?: 'Site', id: string, name: string, timezone: string } }> } | null };

export type UpdateProfileMutationVariables = Exact<{
  siteId: Scalars['ID']['input'];
  input: UpdateProfileInput;
}>;


export type UpdateProfileMutation = { __typename?: 'Mutation', updateProfile: { __typename?: 'Employee', userId?: string | null, allowedActions: Array<string>, permittedFields: Array<string>, salary?: string | null, bank?: string | null, identity?: string | null, id: string, employeeCode: string, displayName: string, workEmail?: string | null, phone?: string | null, photoUpdatedAt?: string | null, jobTitle?: string | null, department?: string | null, version: number, isSelf: boolean, personal?: { __typename?: 'EmployeePersonal', dateOfBirth?: string | null, gender?: string | null, bloodGroup?: string | null, personalEmail?: string | null, address?: string | null, permanentAddress?: string | null, emergencyName?: string | null, emergencyRelation?: string | null, emergencyPhone?: string | null } | null, employment: Array<{ __typename?: 'Employment', id: string, startsOn: string, endsOn?: string | null, legalEmployer: { __typename?: 'LegalEmployer', id: string, name: string } }>, assignments: Array<{ __typename?: 'SiteAssignment', id: string, startsOn: string, endsOn?: string | null, site: { __typename?: 'Site', id: string, name: string, timezone: string } }> } };

export type DecisionFieldsFragment = { __typename?: 'AccessDecision', allowed: boolean, scope: string, rule: string, available?: boolean | null };

export type ChangeFieldsFragment = { __typename?: 'PermissionChange', key: string, before: { __typename?: 'AccessDecision', allowed: boolean, scope: string, rule: string, available?: boolean | null }, after: { __typename?: 'AccessDecision', allowed: boolean, scope: string, rule: string, available?: boolean | null } };

export type AccessUsersQueryVariables = Exact<{
  siteId: Scalars['ID']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
}>;


export type AccessUsersQuery = { __typename?: 'Query', accessUsers: { __typename?: 'AccessUsers', isSuperAdmin: boolean, canManage: boolean, users: Array<{ __typename?: 'AccessUser', id: string, name: string, email: string, active: boolean, version: number, protected: boolean }> } };

export type UserAccessQueryVariables = Exact<{
  siteId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
}>;


export type UserAccessQuery = { __typename?: 'Query', userAccess: { __typename?: 'UserAccess', id: string, name: string, email: string, active: boolean, role: string, version: number, protected: boolean, sites: Array<{ __typename?: 'UserSite', id: string, name: string, active: boolean }>, rules: Array<{ __typename?: 'AccessRule', key: string, effect: string, scope: string }>, delegations: Array<{ __typename?: 'Delegation', key: string, scope: string }>, effective: Array<{ __typename?: 'EffectivePermission', key: string, decision: { __typename?: 'AccessDecision', allowed: boolean, scope: string, rule: string, available?: boolean | null } }>, audit: Array<{ __typename?: 'AccessAudit', id: string, actorId: string, createdAt: string, reason: string, version: number, changes: Array<{ __typename?: 'PermissionChange', key: string, before: { __typename?: 'AccessDecision', allowed: boolean, scope: string, rule: string, available?: boolean | null }, after: { __typename?: 'AccessDecision', allowed: boolean, scope: string, rule: string, available?: boolean | null } }> }> } };

export type PreviewAccessMutationVariables = Exact<{
  siteId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
  input: AccessChangeInput;
}>;


export type PreviewAccessMutation = { __typename?: 'Mutation', previewAccess: { __typename?: 'AccessChangeResult', version: number, changes: Array<{ __typename?: 'PermissionChange', key: string, before: { __typename?: 'AccessDecision', allowed: boolean, scope: string, rule: string, available?: boolean | null }, after: { __typename?: 'AccessDecision', allowed: boolean, scope: string, rule: string, available?: boolean | null } }> } };

export type SaveAccessMutationVariables = Exact<{
  siteId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
  input: AccessChangeInput;
}>;


export type SaveAccessMutation = { __typename?: 'Mutation', saveAccess: { __typename?: 'AccessChangeResult', version: number, changes: Array<{ __typename?: 'PermissionChange', key: string, before: { __typename?: 'AccessDecision', allowed: boolean, scope: string, rule: string, available?: boolean | null }, after: { __typename?: 'AccessDecision', allowed: boolean, scope: string, rule: string, available?: boolean | null } }> } };

export type FoundationQueryVariables = Exact<{
  siteId: Scalars['ID']['input'];
}>;


export type FoundationQuery = { __typename?: 'Query', foundation: { __typename?: 'FoundationData', settings: { __typename?: 'SiteSettings', id: string, name: string, timezone: string, weekStart: number, contactEmail: string, version: number }, references: Array<{ __typename?: 'ReferenceItem', id: string, kind: string, name: string, active: boolean, version: number, startTime?: string | null, endTime?: string | null, date?: string | null }>, employers: Array<{ __typename?: 'LegalEmployer', id: string, name: string }>, managers: Array<{ __typename?: 'ManagerOption', id: string, name: string }>, drafts: Array<{ __typename?: 'EmployeeDraft', id: string, displayName: string, employeeCode: string, workEmail: string, department: string, designation: string, startsOn: string, status: string, version: number, authorId: string, createdAt: string }> } };

export type ProfileRequestsQueryVariables = Exact<{
  siteId: Scalars['ID']['input'];
}>;


export type ProfileRequestsQuery = { __typename?: 'Query', profileRequests: Array<{ __typename?: 'ProfileRequest', id: string, employeeId: string, employeeName: string, phone: string, reason: string, status: string, version: number, createdAt: string, reviewNote?: string | null, isSelf: boolean, hasPhoto: boolean, currentPhone?: string | null, details?: { __typename?: 'EmployeePersonal', dateOfBirth?: string | null, gender?: string | null, bloodGroup?: string | null, personalEmail?: string | null, address?: string | null, permanentAddress?: string | null, emergencyName?: string | null, emergencyRelation?: string | null, emergencyPhone?: string | null } | null, currentDetails?: { __typename?: 'EmployeePersonal', dateOfBirth?: string | null, gender?: string | null, bloodGroup?: string | null, personalEmail?: string | null, address?: string | null, permanentAddress?: string | null, emergencyName?: string | null, emergencyRelation?: string | null, emergencyPhone?: string | null } | null }> };

export type EmployeeDetailsQueryVariables = Exact<{
  siteId: Scalars['ID']['input'];
  employeeId: Scalars['ID']['input'];
}>;


export type EmployeeDetailsQuery = { __typename?: 'Query', employeeDetails: { __typename?: 'EmployeeDetails', reporting: Array<{ __typename?: 'ReportingAssignment', id: string, managerId: string, managerName: string, startsOn: string, endsOn?: string | null }>, shift?: { __typename?: 'EmployeeShift', id: string, name: string, startTime?: string | null, endTime?: string | null } | null } };

export type SaveFoundationMutationVariables = Exact<{
  siteId: Scalars['ID']['input'];
  operation: Scalars['String']['input'];
  input: FoundationInput;
}>;


export type SaveFoundationMutation = { __typename?: 'Mutation', saveFoundation: { __typename?: 'FoundationResult', id?: string | null, version?: number | null, status?: string | null } };

export type OrganizationReportQueryVariables = Exact<{
  siteId: Scalars['ID']['input'];
}>;


export type OrganizationReportQuery = { __typename?: 'Query', organizationReport: { __typename?: 'OrganizationReport', readOnly: boolean, rule: string, sites: Array<{ __typename?: 'SiteReport', id: string, name: string, timezone: string, employees: number }> } };

export type AuditHistoryQueryVariables = Exact<{
  siteId: Scalars['ID']['input'];
}>;


export type AuditHistoryQuery = { __typename?: 'Query', auditHistory: Array<{ __typename?: 'AuditEntry', id: string, actorId: string, action: string, entityId: string, createdAt: string, reason?: string | null }> };

export type QueueExportMutationVariables = Exact<{
  siteId: Scalars['ID']['input'];
  fields: Array<Scalars['String']['input']> | Scalars['String']['input'];
}>;


export type QueueExportMutation = { __typename?: 'Mutation', queueExport: { __typename?: 'ExportJob', id: string, status: string } };

export type ExportJobQueryVariables = Exact<{
  siteId: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
}>;


export type ExportJobQuery = { __typename?: 'Query', exportJob: { __typename?: 'ExportJob', id: string, status: string, expiresAt?: string | null } };

export type OperationsQueryVariables = Exact<{
  siteId: Scalars['ID']['input'];
}>;


export type OperationsQuery = { __typename?: 'Query', operations: unknown };

export type AttendanceReviewQueryVariables = Exact<{
  siteId: Scalars['ID']['input'];
  workDate: Scalars['String']['input'];
}>;


export type AttendanceReviewQuery = { __typename?: 'Query', attendanceReview: unknown };

export type OperateMutationVariables = Exact<{
  siteId: Scalars['ID']['input'];
  operation: Scalars['String']['input'];
  input: Scalars['JSON']['input'];
}>;


export type OperateMutation = { __typename?: 'Mutation', operate: unknown };

export type DwrQueryVariables = Exact<{
  siteId: Scalars['ID']['input'];
  workDate?: InputMaybe<Scalars['String']['input']>;
}>;


export type DwrQuery = { __typename?: 'Query', dwr: unknown };

export type DwrChatQueryVariables = Exact<{
  siteId: Scalars['ID']['input'];
  input: Scalars['JSON']['input'];
}>;


export type DwrChatQuery = { __typename?: 'Query', dwrChat: unknown };

export type DwrCommandMutationVariables = Exact<{
  siteId: Scalars['ID']['input'];
  operation: Scalars['String']['input'];
  input: Scalars['JSON']['input'];
}>;


export type DwrCommandMutation = { __typename?: 'Mutation', dwrCommand: unknown };

export type PayrollQueryVariables = Exact<{
  siteId: Scalars['ID']['input'];
  input?: InputMaybe<Scalars['JSON']['input']>;
}>;


export type PayrollQuery = { __typename?: 'Query', payroll: unknown };

export type HrRecordsQueryVariables = Exact<{
  siteId: Scalars['ID']['input'];
  kind: Scalars['String']['input'];
}>;


export type HrRecordsQuery = { __typename?: 'Query', hrRecords: unknown };

export type PayrollCommandMutationVariables = Exact<{
  siteId: Scalars['ID']['input'];
  operation: Scalars['String']['input'];
  input: Scalars['JSON']['input'];
}>;


export type PayrollCommandMutation = { __typename?: 'Mutation', payrollCommand: unknown };

export type HrCommandMutationVariables = Exact<{
  siteId: Scalars['ID']['input'];
  operation: Scalars['String']['input'];
  input: Scalars['JSON']['input'];
}>;


export type HrCommandMutation = { __typename?: 'Mutation', hrCommand: unknown };

export type ApprovalQueueQueryVariables = Exact<{
  siteId: Scalars['ID']['input'];
}>;


export type ApprovalQueueQuery = { __typename?: 'Query', approvalQueue: unknown };

export type DashboardQueryVariables = Exact<{
  siteId: Scalars['ID']['input'];
}>;


export type DashboardQuery = { __typename?: 'Query', dashboard: unknown };

export type EmployeeLookupQueryVariables = Exact<{
  siteId: Scalars['ID']['input'];
  search: Scalars['String']['input'];
}>;


export type EmployeeLookupQuery = { __typename?: 'Query', employeeLookup: unknown };

export type AnalyticsQueryVariables = Exact<{
  siteId: Scalars['ID']['input'];
  input: Scalars['JSON']['input'];
}>;


export type AnalyticsQuery = { __typename?: 'Query', analytics: unknown };

export type ExplainAnalyticsMutationVariables = Exact<{
  siteId: Scalars['ID']['input'];
  input: Scalars['JSON']['input'];
}>;


export type ExplainAnalyticsMutation = { __typename?: 'Mutation', explainAnalytics: unknown };

export type TrackingContextQueryVariables = Exact<{
  siteId: Scalars['ID']['input'];
}>;


export type TrackingContextQuery = { __typename?: 'Query', trackingContext: unknown };

export type TrackingMonitorQueryVariables = Exact<{
  siteId: Scalars['ID']['input'];
  input: Scalars['JSON']['input'];
}>;


export type TrackingMonitorQuery = { __typename?: 'Query', trackingMonitor: unknown };

export type RoleMatrixQueryVariables = Exact<{
  siteId: Scalars['ID']['input'];
}>;


export type RoleMatrixQuery = { __typename?: 'Query', roleMatrix: unknown };

export type TrackingCommandMutationVariables = Exact<{
  siteId: Scalars['ID']['input'];
  operation: Scalars['String']['input'];
  input: Scalars['JSON']['input'];
}>;


export type TrackingCommandMutation = { __typename?: 'Mutation', trackingCommand: unknown };

export type EmployeeLifecycleMutationVariables = Exact<{
  siteId: Scalars['ID']['input'];
  operation: Scalars['String']['input'];
  input: EmployeeLifecycleInput;
}>;


export type EmployeeLifecycleMutation = { __typename?: 'Mutation', employeeLifecycle: { __typename?: 'EmployeeLifecycleResult', id: string, version: number, password?: string | null } };

export const PersonalFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PersonalFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EmployeePersonal"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dateOfBirth"}},{"kind":"Field","name":{"kind":"Name","value":"gender"}},{"kind":"Field","name":{"kind":"Name","value":"bloodGroup"}},{"kind":"Field","name":{"kind":"Name","value":"personalEmail"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"permanentAddress"}},{"kind":"Field","name":{"kind":"Name","value":"emergencyName"}},{"kind":"Field","name":{"kind":"Name","value":"emergencyRelation"}},{"kind":"Field","name":{"kind":"Name","value":"emergencyPhone"}}]}}]} as unknown as DocumentNode<PersonalFieldsFragment, unknown>;
export const EmployeeFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EmployeeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Employee"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"allowedActions"}},{"kind":"Field","name":{"kind":"Name","value":"permittedFields"}},{"kind":"Field","name":{"kind":"Name","value":"salary"}},{"kind":"Field","name":{"kind":"Name","value":"bank"}},{"kind":"Field","name":{"kind":"Name","value":"identity"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"employeeCode"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"workEmail"}},{"kind":"Field","name":{"kind":"Name","value":"phone"}},{"kind":"Field","name":{"kind":"Name","value":"personal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PersonalFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"photoUpdatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"jobTitle"}},{"kind":"Field","name":{"kind":"Name","value":"department"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"isSelf"}},{"kind":"Field","name":{"kind":"Name","value":"employment"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startsOn"}},{"kind":"Field","name":{"kind":"Name","value":"endsOn"}},{"kind":"Field","name":{"kind":"Name","value":"legalEmployer"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"assignments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startsOn"}},{"kind":"Field","name":{"kind":"Name","value":"endsOn"}},{"kind":"Field","name":{"kind":"Name","value":"site"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PersonalFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EmployeePersonal"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dateOfBirth"}},{"kind":"Field","name":{"kind":"Name","value":"gender"}},{"kind":"Field","name":{"kind":"Name","value":"bloodGroup"}},{"kind":"Field","name":{"kind":"Name","value":"personalEmail"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"permanentAddress"}},{"kind":"Field","name":{"kind":"Name","value":"emergencyName"}},{"kind":"Field","name":{"kind":"Name","value":"emergencyRelation"}},{"kind":"Field","name":{"kind":"Name","value":"emergencyPhone"}}]}}]} as unknown as DocumentNode<EmployeeFieldsFragment, unknown>;
export const EmployeeAdminFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EmployeeAdminFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Employee"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"login"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"loginId"}},{"kind":"Field","name":{"kind":"Name","value":"lastSignInAt"}},{"kind":"Field","name":{"kind":"Name","value":"devices"}},{"kind":"Field","name":{"kind":"Name","value":"protected"}}]}}]}}]} as unknown as DocumentNode<EmployeeAdminFieldsFragment, unknown>;
export const DecisionFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"DecisionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccessDecision"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allowed"}},{"kind":"Field","name":{"kind":"Name","value":"scope"}},{"kind":"Field","name":{"kind":"Name","value":"rule"}},{"kind":"Field","name":{"kind":"Name","value":"available"}}]}}]} as unknown as DocumentNode<DecisionFieldsFragment, unknown>;
export const ChangeFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ChangeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PermissionChange"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"before"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"DecisionFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"after"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"DecisionFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"DecisionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccessDecision"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allowed"}},{"kind":"Field","name":{"kind":"Name","value":"scope"}},{"kind":"Field","name":{"kind":"Name","value":"rule"}},{"kind":"Field","name":{"kind":"Name","value":"available"}}]}}]} as unknown as DocumentNode<ChangeFieldsFragment, unknown>;
export const BootstrapDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Bootstrap"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bootstrap"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"actor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"permissionVersion"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sites"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}}]}}]}}]}}]} as unknown as DocumentNode<BootstrapQuery, BootstrapQueryVariables>;
export const SiteScopeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SiteScope"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"scope"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"site"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}}]}},{"kind":"Field","name":{"kind":"Name","value":"modules"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"hindi"}},{"kind":"Field","name":{"kind":"Name","value":"group"}},{"kind":"Field","name":{"kind":"Name","value":"phase"}},{"kind":"Field","name":{"kind":"Name","value":"available"}},{"kind":"Field","name":{"kind":"Name","value":"actions"}},{"kind":"Field","name":{"kind":"Name","value":"fields"}},{"kind":"Field","name":{"kind":"Name","value":"dependencies"}}]}},{"kind":"Field","name":{"kind":"Name","value":"decisions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"decision"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"DecisionFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"capabilities"}},{"kind":"Field","name":{"kind":"Name","value":"workDate"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"DecisionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccessDecision"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allowed"}},{"kind":"Field","name":{"kind":"Name","value":"scope"}},{"kind":"Field","name":{"kind":"Name","value":"rule"}},{"kind":"Field","name":{"kind":"Name","value":"available"}}]}}]} as unknown as DocumentNode<SiteScopeQuery, SiteScopeQueryVariables>;
export const EmployeesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Employees"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"search"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"department"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"employees"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}},{"kind":"Argument","name":{"kind":"Name","value":"search"},"value":{"kind":"Variable","name":{"kind":"Name","value":"search"}}},{"kind":"Argument","name":{"kind":"Name","value":"department"},"value":{"kind":"Variable","name":{"kind":"Name","value":"department"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EmployeeFields"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"EmployeeAdminFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"endCursor"}},{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PersonalFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EmployeePersonal"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dateOfBirth"}},{"kind":"Field","name":{"kind":"Name","value":"gender"}},{"kind":"Field","name":{"kind":"Name","value":"bloodGroup"}},{"kind":"Field","name":{"kind":"Name","value":"personalEmail"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"permanentAddress"}},{"kind":"Field","name":{"kind":"Name","value":"emergencyName"}},{"kind":"Field","name":{"kind":"Name","value":"emergencyRelation"}},{"kind":"Field","name":{"kind":"Name","value":"emergencyPhone"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EmployeeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Employee"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"allowedActions"}},{"kind":"Field","name":{"kind":"Name","value":"permittedFields"}},{"kind":"Field","name":{"kind":"Name","value":"salary"}},{"kind":"Field","name":{"kind":"Name","value":"bank"}},{"kind":"Field","name":{"kind":"Name","value":"identity"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"employeeCode"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"workEmail"}},{"kind":"Field","name":{"kind":"Name","value":"phone"}},{"kind":"Field","name":{"kind":"Name","value":"personal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PersonalFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"photoUpdatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"jobTitle"}},{"kind":"Field","name":{"kind":"Name","value":"department"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"isSelf"}},{"kind":"Field","name":{"kind":"Name","value":"employment"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startsOn"}},{"kind":"Field","name":{"kind":"Name","value":"endsOn"}},{"kind":"Field","name":{"kind":"Name","value":"legalEmployer"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"assignments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startsOn"}},{"kind":"Field","name":{"kind":"Name","value":"endsOn"}},{"kind":"Field","name":{"kind":"Name","value":"site"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EmployeeAdminFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Employee"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"login"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"loginId"}},{"kind":"Field","name":{"kind":"Name","value":"lastSignInAt"}},{"kind":"Field","name":{"kind":"Name","value":"devices"}},{"kind":"Field","name":{"kind":"Name","value":"protected"}}]}}]}}]} as unknown as DocumentNode<EmployeesQuery, EmployeesQueryVariables>;
export const EmployeeRecordDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"EmployeeRecord"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"employee"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EmployeeFields"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"EmployeeAdminFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PersonalFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EmployeePersonal"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dateOfBirth"}},{"kind":"Field","name":{"kind":"Name","value":"gender"}},{"kind":"Field","name":{"kind":"Name","value":"bloodGroup"}},{"kind":"Field","name":{"kind":"Name","value":"personalEmail"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"permanentAddress"}},{"kind":"Field","name":{"kind":"Name","value":"emergencyName"}},{"kind":"Field","name":{"kind":"Name","value":"emergencyRelation"}},{"kind":"Field","name":{"kind":"Name","value":"emergencyPhone"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EmployeeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Employee"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"allowedActions"}},{"kind":"Field","name":{"kind":"Name","value":"permittedFields"}},{"kind":"Field","name":{"kind":"Name","value":"salary"}},{"kind":"Field","name":{"kind":"Name","value":"bank"}},{"kind":"Field","name":{"kind":"Name","value":"identity"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"employeeCode"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"workEmail"}},{"kind":"Field","name":{"kind":"Name","value":"phone"}},{"kind":"Field","name":{"kind":"Name","value":"personal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PersonalFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"photoUpdatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"jobTitle"}},{"kind":"Field","name":{"kind":"Name","value":"department"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"isSelf"}},{"kind":"Field","name":{"kind":"Name","value":"employment"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startsOn"}},{"kind":"Field","name":{"kind":"Name","value":"endsOn"}},{"kind":"Field","name":{"kind":"Name","value":"legalEmployer"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"assignments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startsOn"}},{"kind":"Field","name":{"kind":"Name","value":"endsOn"}},{"kind":"Field","name":{"kind":"Name","value":"site"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EmployeeAdminFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Employee"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"login"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"loginId"}},{"kind":"Field","name":{"kind":"Name","value":"lastSignInAt"}},{"kind":"Field","name":{"kind":"Name","value":"devices"}},{"kind":"Field","name":{"kind":"Name","value":"protected"}}]}}]}}]} as unknown as DocumentNode<EmployeeRecordQuery, EmployeeRecordQueryVariables>;
export const MyProfileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MyProfile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myProfile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EmployeeFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PersonalFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EmployeePersonal"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dateOfBirth"}},{"kind":"Field","name":{"kind":"Name","value":"gender"}},{"kind":"Field","name":{"kind":"Name","value":"bloodGroup"}},{"kind":"Field","name":{"kind":"Name","value":"personalEmail"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"permanentAddress"}},{"kind":"Field","name":{"kind":"Name","value":"emergencyName"}},{"kind":"Field","name":{"kind":"Name","value":"emergencyRelation"}},{"kind":"Field","name":{"kind":"Name","value":"emergencyPhone"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EmployeeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Employee"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"allowedActions"}},{"kind":"Field","name":{"kind":"Name","value":"permittedFields"}},{"kind":"Field","name":{"kind":"Name","value":"salary"}},{"kind":"Field","name":{"kind":"Name","value":"bank"}},{"kind":"Field","name":{"kind":"Name","value":"identity"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"employeeCode"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"workEmail"}},{"kind":"Field","name":{"kind":"Name","value":"phone"}},{"kind":"Field","name":{"kind":"Name","value":"personal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PersonalFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"photoUpdatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"jobTitle"}},{"kind":"Field","name":{"kind":"Name","value":"department"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"isSelf"}},{"kind":"Field","name":{"kind":"Name","value":"employment"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startsOn"}},{"kind":"Field","name":{"kind":"Name","value":"endsOn"}},{"kind":"Field","name":{"kind":"Name","value":"legalEmployer"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"assignments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startsOn"}},{"kind":"Field","name":{"kind":"Name","value":"endsOn"}},{"kind":"Field","name":{"kind":"Name","value":"site"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}}]}}]}}]}}]} as unknown as DocumentNode<MyProfileQuery, MyProfileQueryVariables>;
export const UpdateProfileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateProfile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateProfileInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProfile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EmployeeFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PersonalFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EmployeePersonal"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dateOfBirth"}},{"kind":"Field","name":{"kind":"Name","value":"gender"}},{"kind":"Field","name":{"kind":"Name","value":"bloodGroup"}},{"kind":"Field","name":{"kind":"Name","value":"personalEmail"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"permanentAddress"}},{"kind":"Field","name":{"kind":"Name","value":"emergencyName"}},{"kind":"Field","name":{"kind":"Name","value":"emergencyRelation"}},{"kind":"Field","name":{"kind":"Name","value":"emergencyPhone"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EmployeeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Employee"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"allowedActions"}},{"kind":"Field","name":{"kind":"Name","value":"permittedFields"}},{"kind":"Field","name":{"kind":"Name","value":"salary"}},{"kind":"Field","name":{"kind":"Name","value":"bank"}},{"kind":"Field","name":{"kind":"Name","value":"identity"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"employeeCode"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"workEmail"}},{"kind":"Field","name":{"kind":"Name","value":"phone"}},{"kind":"Field","name":{"kind":"Name","value":"personal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PersonalFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"photoUpdatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"jobTitle"}},{"kind":"Field","name":{"kind":"Name","value":"department"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"isSelf"}},{"kind":"Field","name":{"kind":"Name","value":"employment"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startsOn"}},{"kind":"Field","name":{"kind":"Name","value":"endsOn"}},{"kind":"Field","name":{"kind":"Name","value":"legalEmployer"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"assignments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startsOn"}},{"kind":"Field","name":{"kind":"Name","value":"endsOn"}},{"kind":"Field","name":{"kind":"Name","value":"site"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateProfileMutation, UpdateProfileMutationVariables>;
export const AccessUsersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AccessUsers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"search"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"accessUsers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"search"},"value":{"kind":"Variable","name":{"kind":"Name","value":"search"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"users"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"active"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"protected"}}]}},{"kind":"Field","name":{"kind":"Name","value":"isSuperAdmin"}},{"kind":"Field","name":{"kind":"Name","value":"canManage"}}]}}]}}]} as unknown as DocumentNode<AccessUsersQuery, AccessUsersQueryVariables>;
export const UserAccessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UserAccess"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userAccess"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"active"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"protected"}},{"kind":"Field","name":{"kind":"Name","value":"sites"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"active"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rules"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"effect"}},{"kind":"Field","name":{"kind":"Name","value":"scope"}}]}},{"kind":"Field","name":{"kind":"Name","value":"delegations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"scope"}}]}},{"kind":"Field","name":{"kind":"Name","value":"effective"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"decision"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"DecisionFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"audit"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"actorId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"changes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChangeFields"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"DecisionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccessDecision"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allowed"}},{"kind":"Field","name":{"kind":"Name","value":"scope"}},{"kind":"Field","name":{"kind":"Name","value":"rule"}},{"kind":"Field","name":{"kind":"Name","value":"available"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ChangeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PermissionChange"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"before"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"DecisionFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"after"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"DecisionFields"}}]}}]}}]} as unknown as DocumentNode<UserAccessQuery, UserAccessQueryVariables>;
export const PreviewAccessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PreviewAccess"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AccessChangeInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"previewAccess"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"changes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChangeFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"DecisionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccessDecision"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allowed"}},{"kind":"Field","name":{"kind":"Name","value":"scope"}},{"kind":"Field","name":{"kind":"Name","value":"rule"}},{"kind":"Field","name":{"kind":"Name","value":"available"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ChangeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PermissionChange"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"before"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"DecisionFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"after"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"DecisionFields"}}]}}]}}]} as unknown as DocumentNode<PreviewAccessMutation, PreviewAccessMutationVariables>;
export const SaveAccessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SaveAccess"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AccessChangeInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"saveAccess"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"changes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChangeFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"DecisionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccessDecision"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allowed"}},{"kind":"Field","name":{"kind":"Name","value":"scope"}},{"kind":"Field","name":{"kind":"Name","value":"rule"}},{"kind":"Field","name":{"kind":"Name","value":"available"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ChangeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PermissionChange"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"before"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"DecisionFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"after"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"DecisionFields"}}]}}]}}]} as unknown as DocumentNode<SaveAccessMutation, SaveAccessMutationVariables>;
export const FoundationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Foundation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"foundation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"settings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"weekStart"}},{"kind":"Field","name":{"kind":"Name","value":"contactEmail"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"references"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"active"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"startTime"}},{"kind":"Field","name":{"kind":"Name","value":"endTime"}},{"kind":"Field","name":{"kind":"Name","value":"date"}}]}},{"kind":"Field","name":{"kind":"Name","value":"employers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"managers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"drafts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"employeeCode"}},{"kind":"Field","name":{"kind":"Name","value":"workEmail"}},{"kind":"Field","name":{"kind":"Name","value":"department"}},{"kind":"Field","name":{"kind":"Name","value":"designation"}},{"kind":"Field","name":{"kind":"Name","value":"startsOn"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"authorId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}}]} as unknown as DocumentNode<FoundationQuery, FoundationQueryVariables>;
export const ProfileRequestsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProfileRequests"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"profileRequests"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"employeeId"}},{"kind":"Field","name":{"kind":"Name","value":"employeeName"}},{"kind":"Field","name":{"kind":"Name","value":"phone"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"reviewNote"}},{"kind":"Field","name":{"kind":"Name","value":"isSelf"}},{"kind":"Field","name":{"kind":"Name","value":"details"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PersonalFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"hasPhoto"}},{"kind":"Field","name":{"kind":"Name","value":"currentPhone"}},{"kind":"Field","name":{"kind":"Name","value":"currentDetails"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PersonalFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PersonalFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"EmployeePersonal"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dateOfBirth"}},{"kind":"Field","name":{"kind":"Name","value":"gender"}},{"kind":"Field","name":{"kind":"Name","value":"bloodGroup"}},{"kind":"Field","name":{"kind":"Name","value":"personalEmail"}},{"kind":"Field","name":{"kind":"Name","value":"address"}},{"kind":"Field","name":{"kind":"Name","value":"permanentAddress"}},{"kind":"Field","name":{"kind":"Name","value":"emergencyName"}},{"kind":"Field","name":{"kind":"Name","value":"emergencyRelation"}},{"kind":"Field","name":{"kind":"Name","value":"emergencyPhone"}}]}}]} as unknown as DocumentNode<ProfileRequestsQuery, ProfileRequestsQueryVariables>;
export const EmployeeDetailsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"EmployeeDetails"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"employeeId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"employeeDetails"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"employeeId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"employeeId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reporting"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"managerId"}},{"kind":"Field","name":{"kind":"Name","value":"managerName"}},{"kind":"Field","name":{"kind":"Name","value":"startsOn"}},{"kind":"Field","name":{"kind":"Name","value":"endsOn"}}]}},{"kind":"Field","name":{"kind":"Name","value":"shift"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"startTime"}},{"kind":"Field","name":{"kind":"Name","value":"endTime"}}]}}]}}]}}]} as unknown as DocumentNode<EmployeeDetailsQuery, EmployeeDetailsQueryVariables>;
export const SaveFoundationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SaveFoundation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"operation"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"FoundationInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"saveFoundation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"operation"},"value":{"kind":"Variable","name":{"kind":"Name","value":"operation"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<SaveFoundationMutation, SaveFoundationMutationVariables>;
export const OrganizationReportDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OrganizationReport"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"organizationReport"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"readOnly"}},{"kind":"Field","name":{"kind":"Name","value":"rule"}},{"kind":"Field","name":{"kind":"Name","value":"sites"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"employees"}}]}}]}}]}}]} as unknown as DocumentNode<OrganizationReportQuery, OrganizationReportQueryVariables>;
export const AuditHistoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AuditHistory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"auditHistory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"actorId"}},{"kind":"Field","name":{"kind":"Name","value":"action"}},{"kind":"Field","name":{"kind":"Name","value":"entityId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}}]}}]}}]} as unknown as DocumentNode<AuditHistoryQuery, AuditHistoryQueryVariables>;
export const QueueExportDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"QueueExport"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"fields"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"queueExport"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"fields"},"value":{"kind":"Variable","name":{"kind":"Name","value":"fields"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<QueueExportMutation, QueueExportMutationVariables>;
export const ExportJobDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ExportJob"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exportJob"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}}]}}]}}]} as unknown as DocumentNode<ExportJobQuery, ExportJobQueryVariables>;
export const OperationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Operations"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"operations"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}}]}]}}]} as unknown as DocumentNode<OperationsQuery, OperationsQueryVariables>;
export const AttendanceReviewDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AttendanceReview"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workDate"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attendanceReview"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"workDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workDate"}}}]}]}}]} as unknown as DocumentNode<AttendanceReviewQuery, AttendanceReviewQueryVariables>;
export const OperateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Operate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"operation"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"operate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"operation"},"value":{"kind":"Variable","name":{"kind":"Name","value":"operation"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<OperateMutation, OperateMutationVariables>;
export const DwrDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Dwr"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workDate"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dwr"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"workDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workDate"}}}]}]}}]} as unknown as DocumentNode<DwrQuery, DwrQueryVariables>;
export const DwrChatDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DwrChat"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dwrChat"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<DwrChatQuery, DwrChatQueryVariables>;
export const DwrCommandDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DwrCommand"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"operation"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dwrCommand"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"operation"},"value":{"kind":"Variable","name":{"kind":"Name","value":"operation"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<DwrCommandMutation, DwrCommandMutationVariables>;
export const PayrollDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Payroll"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"payroll"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<PayrollQuery, PayrollQueryVariables>;
export const HrRecordsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"HrRecords"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"kind"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hrRecords"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"kind"},"value":{"kind":"Variable","name":{"kind":"Name","value":"kind"}}}]}]}}]} as unknown as DocumentNode<HrRecordsQuery, HrRecordsQueryVariables>;
export const PayrollCommandDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PayrollCommand"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"operation"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"payrollCommand"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"operation"},"value":{"kind":"Variable","name":{"kind":"Name","value":"operation"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<PayrollCommandMutation, PayrollCommandMutationVariables>;
export const HrCommandDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"HrCommand"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"operation"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hrCommand"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"operation"},"value":{"kind":"Variable","name":{"kind":"Name","value":"operation"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<HrCommandMutation, HrCommandMutationVariables>;
export const ApprovalQueueDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ApprovalQueue"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"approvalQueue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}}]}]}}]} as unknown as DocumentNode<ApprovalQueueQuery, ApprovalQueueQueryVariables>;
export const DashboardDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Dashboard"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dashboard"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}}]}]}}]} as unknown as DocumentNode<DashboardQuery, DashboardQueryVariables>;
export const EmployeeLookupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"EmployeeLookup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"search"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"employeeLookup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"search"},"value":{"kind":"Variable","name":{"kind":"Name","value":"search"}}}]}]}}]} as unknown as DocumentNode<EmployeeLookupQuery, EmployeeLookupQueryVariables>;
export const AnalyticsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Analytics"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"analytics"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<AnalyticsQuery, AnalyticsQueryVariables>;
export const ExplainAnalyticsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ExplainAnalytics"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"explainAnalytics"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<ExplainAnalyticsMutation, ExplainAnalyticsMutationVariables>;
export const TrackingContextDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TrackingContext"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"trackingContext"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}}]}]}}]} as unknown as DocumentNode<TrackingContextQuery, TrackingContextQueryVariables>;
export const TrackingMonitorDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TrackingMonitor"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"trackingMonitor"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<TrackingMonitorQuery, TrackingMonitorQueryVariables>;
export const RoleMatrixDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RoleMatrix"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"roleMatrix"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}}]}]}}]} as unknown as DocumentNode<RoleMatrixQuery, RoleMatrixQueryVariables>;
export const TrackingCommandDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"TrackingCommand"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"operation"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"trackingCommand"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"operation"},"value":{"kind":"Variable","name":{"kind":"Name","value":"operation"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<TrackingCommandMutation, TrackingCommandMutationVariables>;
export const EmployeeLifecycleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"EmployeeLifecycle"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"operation"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"EmployeeLifecycleInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"employeeLifecycle"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"operation"},"value":{"kind":"Variable","name":{"kind":"Name","value":"operation"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"password"}}]}}]}}]} as unknown as DocumentNode<EmployeeLifecycleMutation, EmployeeLifecycleMutationVariables>;