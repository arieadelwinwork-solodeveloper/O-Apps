/** Kredensial dummy untuk development — lihat docs/DUMMY_ACCOUNTS.md */
export const DUMMY_ACCOUNTS = {
  owner: {
    email: "pos-owner@example.com",
    password: "DemoOwner123",
    label: "Owner (Budi)",
  },
  karyawan: {
    email: "pos-kasir@example.com",
    password: "DemoKasir123",
    label: "Karyawan (Siti)",
  },
} as const;
