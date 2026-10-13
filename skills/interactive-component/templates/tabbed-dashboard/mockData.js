// Mock data — pure JS module, no React. Sibling files import the
// named exports directly.

export const customers = [
  { id: 'C-1001', name: 'Acme Corp',       segment: 'Enterprise', ltv: 284500, satisfaction: 92, status: 'Healthy' },
  { id: 'C-1002', name: 'TechNova Ltd',    segment: 'Mid-Market', ltv: 156200, satisfaction: 78, status: 'At Risk' },
  { id: 'C-1003', name: 'GlobalEdge Inc',  segment: 'Enterprise', ltv: 312800, satisfaction: 88, status: 'Healthy' },
  { id: 'C-1004', name: 'StartUp.io',      segment: 'SMB',        ltv: 42300,  satisfaction: 95, status: 'Healthy' },
  { id: 'C-1005', name: 'RetailMax',       segment: 'Mid-Market', ltv: 128700, satisfaction: 65, status: 'Churning' },
  { id: 'C-1006', name: 'FinServe Global', segment: 'Enterprise', ltv: 445000, satisfaction: 91, status: 'Healthy' },
];

export const revenueByMonth = [
  { month: 'Jan', revenue: 120 },
  { month: 'Feb', revenue: 145 },
  { month: 'Mar', revenue: 132 },
  { month: 'Apr', revenue: 168 },
  { month: 'May', revenue: 184 },
  { month: 'Jun', revenue: 196 },
  { month: 'Jul', revenue: 215 },
  { month: 'Aug', revenue: 232 },
  { month: 'Sep', revenue: 248 },
  { month: 'Oct', revenue: 267 },
  { month: 'Nov', revenue: 285 },
  { month: 'Dec', revenue: 312 },
];
