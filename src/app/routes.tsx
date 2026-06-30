import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { ProtectedRoute, RoleRoute } from "./components/ProtectedRoute";
import { Login } from "./views/Login";
import { SignUp } from "./views/SignUp";
import { Dashboard } from "./views/Dashboard";
import { OrderView } from "./views/OrderView";
import { TrackingView } from "./views/TrackingView";
import { FinanceView } from "./views/FinanceView";
import { ExpensesView } from "./views/ExpensesView";
import { ServicesView } from "./views/ServicesView";
import { TemplatesView } from "./views/TemplatesView";
import { CashShiftView } from "./views/CashShiftView";
import { OrderDetailView } from "./views/OrderDetailView";
import { PrinterView } from "./views/PrinterView";
import { AttendanceView } from "./views/AttendanceView";
import { PayrollView } from "./views/PayrollView";
import { MembershipView } from "./views/MembershipView";
import { InventoryView } from "./views/InventoryView";
import { CustomersView } from "./views/CustomersView";
import { CustomerDetailView } from "./views/CustomerDetailView";
import { ReportsView } from "./views/ReportsView";

function OwnerOnly() {
  return <RoleRoute allow={["owner"]} />;
}

export const router = createBrowserRouter([
  { path: "/login", Component: Login },
  { path: "/signup", Component: SignUp },
  {
    Component: ProtectedRoute,
    children: [
      {
        path: "/",
        Component: Layout,
        children: [
          { index: true, Component: Dashboard },
          { path: "pemesanan", Component: OrderView },
          { path: "transaksi", Component: TrackingView },
          { path: "transaksi/:id", Component: OrderDetailView },
          { path: "pengeluaran", Component: ExpensesView },
          { path: "kas", Component: CashShiftView },
          { path: "printer", Component: PrinterView },
          { path: "laporan", Component: ReportsView },
          { path: "absensi", Component: AttendanceView },
          { path: "penggajian", Component: PayrollView },
          { path: "inventori", Component: InventoryView },
          { path: "konsumen", Component: CustomersView },
          { path: "konsumen/:id", Component: CustomerDetailView },
          {
            Component: OwnerOnly,
            children: [
              { path: "keuangan", Component: FinanceView },
              { path: "layanan", Component: ServicesView },
              { path: "template", Component: TemplatesView },
              { path: "membership", Component: MembershipView },
            ],
          },
        ],
      },
    ],
  },
]);
