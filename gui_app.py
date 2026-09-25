"""
BoardEase GUI (Tkinter)

A simple graphical front end over the existing BoardEase domain classes
(person.py, tenant.py, owner.py, room.py, single_room.py, shared_room.py,
utility_reading.py, bill.py, payment.py, notification.py, boarding_house.py).

Run with:  python3 gui_app.py
"""

import io
import contextlib
import tkinter as tk
from tkinter import ttk, messagebox

from owner import Owner
from tenant import Tenant
from single_room import SingleRoom
from shared_room import SharedRoom
from utility_reading import UtilityReading
from boarding_house import BoardingHouse


class BoardEaseApp:
    def __init__(self, root):
        self.root = root
        self.root.title("BoardEase - Boarding House Management")
        self.root.geometry("820x600")

        # Domain state
        self.owner = Owner("Mrs. Santos", "0917-000-0001")
        self.house = BoardingHouse(self.owner)

        notebook = ttk.Notebook(root)
        notebook.pack(fill="both", expand=True, padx=8, pady=8)

        self.setup_tab = ttk.Frame(notebook)
        self.billing_tab = ttk.Frame(notebook)
        self.payments_tab = ttk.Frame(notebook)
        self.dashboard_tab = ttk.Frame(notebook)

        notebook.add(self.setup_tab, text="Rooms & Tenants")
        notebook.add(self.billing_tab, text="Billing")
        notebook.add(self.payments_tab, text="Payments")
        notebook.add(self.dashboard_tab, text="Dashboards")

        self._build_setup_tab()
        self._build_billing_tab()
        self._build_payments_tab()
        self._build_dashboard_tab()

        # Populate the UI with anything reloaded from billing_ledger.xlsx
        self._refresh_rooms_ui()
        self._refresh_tenant_dropdowns()
        self._refresh_bills_ui()

    # ---------------------------------------------------------------
    # Rooms & Tenants tab
    # ---------------------------------------------------------------
    def _build_setup_tab(self):
        frame = self.setup_tab

        # --- Add Room ---
        room_box = ttk.LabelFrame(frame, text="Add Room")
        room_box.pack(fill="x", padx=10, pady=8)

        ttk.Label(room_box, text="Room Number:").grid(row=0, column=0, sticky="w", padx=5, pady=4)
        self.room_number_entry = ttk.Entry(room_box, width=15)
        self.room_number_entry.grid(row=0, column=1, padx=5, pady=4)

        ttk.Label(room_box, text="Base Rent:").grid(row=0, column=2, sticky="w", padx=5, pady=4)
        self.room_rent_entry = ttk.Entry(room_box, width=15)
        self.room_rent_entry.grid(row=0, column=3, padx=5, pady=4)

        self.room_type = tk.StringVar(value="single")
        ttk.Radiobutton(room_box, text="Single", variable=self.room_type,
                         value="single", command=self._toggle_occupancy_field).grid(row=1, column=0, padx=5, sticky="w")
        ttk.Radiobutton(room_box, text="Shared", variable=self.room_type,
                         value="shared", command=self._toggle_occupancy_field).grid(row=1, column=1, padx=5, sticky="w")

        ttk.Label(room_box, text="Max Occupancy (shared only):").grid(row=1, column=2, sticky="w", padx=5)
        self.max_occupancy_entry = ttk.Entry(room_box, width=10, state="disabled")
        self.max_occupancy_entry.grid(row=1, column=3, padx=5)

        ttk.Button(room_box, text="Add Room", command=self._add_room).grid(row=2, column=0, columnspan=4, pady=6)

        # --- Add Tenant ---
        tenant_box = ttk.LabelFrame(frame, text="Add Tenant")
        tenant_box.pack(fill="x", padx=10, pady=8)

        ttk.Label(tenant_box, text="Name:").grid(row=0, column=0, sticky="w", padx=5, pady=4)
        self.tenant_name_entry = ttk.Entry(tenant_box, width=20)
        self.tenant_name_entry.grid(row=0, column=1, padx=5, pady=4)

        ttk.Label(tenant_box, text="Contact #:").grid(row=0, column=2, sticky="w", padx=5, pady=4)
        self.tenant_contact_entry = ttk.Entry(tenant_box, width=15)
        self.tenant_contact_entry.grid(row=0, column=3, padx=5, pady=4)

        ttk.Label(tenant_box, text="Assign to Room:").grid(row=1, column=0, sticky="w", padx=5, pady=4)
        self.tenant_room_combo = ttk.Combobox(tenant_box, width=17, state="readonly")
        self.tenant_room_combo.grid(row=1, column=1, padx=5, pady=4)

        ttk.Button(tenant_box, text="Add Tenant", command=self._add_tenant).grid(row=2, column=0, columnspan=4, pady=6)

        # --- Lists ---
        list_box = ttk.LabelFrame(frame, text="Current Rooms & Tenants")
        list_box.pack(fill="both", expand=True, padx=10, pady=8)

        self.rooms_listbox = tk.Listbox(list_box, height=10)
        self.rooms_listbox.pack(fill="both", expand=True, padx=5, pady=5)

    def _toggle_occupancy_field(self):
        if self.room_type.get() == "shared":
            self.max_occupancy_entry.config(state="normal")
        else:
            self.max_occupancy_entry.delete(0, tk.END)
            self.max_occupancy_entry.config(state="disabled")

    def _add_room(self):
        number = self.room_number_entry.get().strip()
        rent_text = self.room_rent_entry.get().strip()

        if not number or not rent_text:
            messagebox.showerror("Missing info", "Room number and base rent are required.")
            return
        try:
            rent = float(rent_text)
        except ValueError:
            messagebox.showerror("Invalid input", "Base rent must be a number.")
            return

        if self.room_type.get() == "single":
            room = SingleRoom(number, rent)
        else:
            occ_text = self.max_occupancy_entry.get().strip()
            if not occ_text:
                messagebox.showerror("Missing info", "Max occupancy is required for a shared room.")
                return
            try:
                max_occ = int(occ_text)
            except ValueError:
                messagebox.showerror("Invalid input", "Max occupancy must be a whole number.")
                return
            room = SharedRoom(number, rent, max_occ)

        self.house.add_room(room)
        self._refresh_rooms_ui()

        self.room_number_entry.delete(0, tk.END)
        self.room_rent_entry.delete(0, tk.END)
        self.max_occupancy_entry.delete(0, tk.END)

    def _add_tenant(self):
        name = self.tenant_name_entry.get().strip()
        contact = self.tenant_contact_entry.get().strip()
        room_choice = self.tenant_room_combo.get()

        if not name or not contact or not room_choice:
            messagebox.showerror("Missing info", "Name, contact number, and a room are all required.")
            return

        room = self._find_room_by_display(room_choice)
        if room is None:
            messagebox.showerror("Error", "Selected room not found.")
            return
        if len(room.tenants) >= room.get_max_occupancy():
            messagebox.showerror("Room full", f"Room {room.room_number} is already at full occupancy.")
            return

        tenant = Tenant(name, contact)
        self.house.add_tenant(tenant, room)  # routes through BoardingHouse so it's logged to Excel

        self._refresh_rooms_ui()
        self._refresh_tenant_dropdowns()

        self.tenant_name_entry.delete(0, tk.END)
        self.tenant_contact_entry.delete(0, tk.END)

    def _find_room_by_display(self, display_text):
        room_number = display_text.split(" ")[0]
        for room in self.house.rooms:
            if room.room_number == room_number:
                return room
        return None

    def _refresh_rooms_ui(self):
        self.rooms_listbox.delete(0, tk.END)
        for room in self.house.rooms:
            self.rooms_listbox.insert(tk.END, str(room))
            for tenant in room.tenants:
                self.rooms_listbox.insert(tk.END, f"    - {tenant}")

        room_choices = [f"{r.room_number} ({type(r).__name__})" for r in self.house.rooms]
        self.tenant_room_combo["values"] = room_choices
        self.billing_room_combo["values"] = room_choices

    def _refresh_tenant_dropdowns(self):
        all_tenants = [t for room in self.house.rooms for t in room.tenants]
        names = [t.name for t in all_tenants]
        self.dashboard_tenant_combo["values"] = names
        self._all_tenants = all_tenants

    # ---------------------------------------------------------------
    # Billing tab
    # ---------------------------------------------------------------
    def _build_billing_tab(self):
        frame = self.billing_tab

        reading_box = ttk.LabelFrame(frame, text="Enter Monthly Utility Reading & Generate Bills")
        reading_box.pack(fill="x", padx=10, pady=8)

        ttk.Label(reading_box, text="Room:").grid(row=0, column=0, sticky="w", padx=5, pady=4)
        self.billing_room_combo = ttk.Combobox(reading_box, width=17, state="readonly")
        self.billing_room_combo.grid(row=0, column=1, padx=5, pady=4)

        ttk.Label(reading_box, text="Month (YYYY-MM):").grid(row=0, column=2, sticky="w", padx=5)
        self.month_entry = ttk.Entry(reading_box, width=12)
        self.month_entry.grid(row=0, column=3, padx=5)

        ttk.Label(reading_box, text="Electricity (kWh):").grid(row=1, column=0, sticky="w", padx=5, pady=4)
        self.kwh_entry = ttk.Entry(reading_box, width=12)
        self.kwh_entry.grid(row=1, column=1, padx=5)

        ttk.Label(reading_box, text="Water (cu.m):").grid(row=1, column=2, sticky="w", padx=5)
        self.water_entry = ttk.Entry(reading_box, width=12)
        self.water_entry.grid(row=1, column=3, padx=5)

        ttk.Label(reading_box, text="Rate/kWh:").grid(row=2, column=0, sticky="w", padx=5, pady=4)
        self.elec_rate_entry = ttk.Entry(reading_box, width=12)
        self.elec_rate_entry.grid(row=2, column=1, padx=5)
        self.elec_rate_entry.insert(0, "12.0")

        ttk.Label(reading_box, text="Rate/cu.m:").grid(row=2, column=2, sticky="w", padx=5)
        self.water_rate_entry = ttk.Entry(reading_box, width=12)
        self.water_rate_entry.grid(row=2, column=3, padx=5)
        self.water_rate_entry.insert(0, "30.0")

        ttk.Label(reading_box, text="Due Date (YYYY-MM-DD):").grid(row=3, column=0, sticky="w", padx=5, pady=4)
        self.due_date_entry = ttk.Entry(reading_box, width=15)
        self.due_date_entry.grid(row=3, column=1, padx=5)

        ttk.Button(reading_box, text="Generate Bills", command=self._generate_bills).grid(
            row=3, column=3, padx=5, pady=6)

        list_box = ttk.LabelFrame(frame, text="Bills")
        list_box.pack(fill="both", expand=True, padx=10, pady=8)
        self.bills_listbox = tk.Listbox(list_box, height=10)
        self.bills_listbox.pack(fill="both", expand=True, padx=5, pady=5)

        ttk.Button(frame, text="Send Payment Reminders", command=self._send_reminders).pack(pady=4)

    def _generate_bills(self):
        room_choice = self.billing_room_combo.get()
        month = self.month_entry.get().strip()
        due_date = self.due_date_entry.get().strip()

        if not room_choice or not month or not due_date:
            messagebox.showerror("Missing info", "Room, month, and due date are required.")
            return

        room = self._find_room_by_display(room_choice)
        if room is None or not room.tenants:
            messagebox.showerror("Error", "Selected room has no tenants yet.")
            return

        try:
            kwh = float(self.kwh_entry.get() or 0)
            water = float(self.water_entry.get() or 0)
            elec_rate = float(self.elec_rate_entry.get())
            water_rate = float(self.water_rate_entry.get())
        except ValueError:
            messagebox.showerror("Invalid input", "Utility readings and rates must be numbers.")
            return

        reading = UtilityReading(room, month, kwh, water, elec_rate, water_rate)
        self.house.generate_bills_for_room(reading, due_date)
        self._refresh_bills_ui()

    def _refresh_bills_ui(self):
        self.bills_listbox.delete(0, tk.END)
        for bill in self.house.bills:
            self.bills_listbox.insert(tk.END, str(bill))
        self._refresh_payment_dropdown()

    def _send_reminders(self):
        log = io.StringIO()
        with contextlib.redirect_stdout(log):
            self.house.send_all_reminders()
        output = log.getvalue().strip()
        messagebox.showinfo("Reminders Sent", output if output else "No reminders to send yet.")

    # ---------------------------------------------------------------
    # Payments tab
    # ---------------------------------------------------------------
    def _build_payments_tab(self):
        frame = self.payments_tab

        box = ttk.LabelFrame(frame, text="Record a Payment")
        box.pack(fill="x", padx=10, pady=8)

        ttk.Label(box, text="Unpaid Bill:").grid(row=0, column=0, sticky="w", padx=5, pady=4)
        self.payment_bill_combo = ttk.Combobox(box, width=45, state="readonly")
        self.payment_bill_combo.grid(row=0, column=1, columnspan=3, padx=5, pady=4, sticky="w")

        ttk.Label(box, text="Amount Paid:").grid(row=1, column=0, sticky="w", padx=5, pady=4)
        self.payment_amount_entry = ttk.Entry(box, width=15)
        self.payment_amount_entry.grid(row=1, column=1, padx=5, pady=4)

        ttk.Label(box, text="Date Paid (YYYY-MM-DD):").grid(row=1, column=2, sticky="w", padx=5)
        self.payment_date_entry = ttk.Entry(box, width=15)
        self.payment_date_entry.grid(row=1, column=3, padx=5)

        ttk.Button(box, text="Record Payment", command=self._record_payment).grid(
            row=2, column=0, columnspan=4, pady=6)

        list_box = ttk.LabelFrame(frame, text="Payment History")
        list_box.pack(fill="both", expand=True, padx=10, pady=8)
        self.payments_listbox = tk.Listbox(list_box, height=10)
        self.payments_listbox.pack(fill="both", expand=True, padx=5, pady=5)

    def _refresh_payment_dropdown(self):
        unpaid = [b for b in self.house.bills if not b.paid]
        self._unpaid_bills = unpaid
        choices = [f"{b.tenant.name} - {b.month} - P{b.get_total_amount():.2f}" for b in unpaid]
        self.payment_bill_combo["values"] = choices

    def _record_payment(self):
        idx = self.payment_bill_combo.current()
        if idx < 0:
            messagebox.showerror("Missing info", "Select an unpaid bill first.")
            return

        try:
            amount = float(self.payment_amount_entry.get())
        except ValueError:
            messagebox.showerror("Invalid input", "Amount paid must be a number.")
            return

        date_paid = self.payment_date_entry.get().strip()
        if not date_paid:
            messagebox.showerror("Missing info", "Date paid is required.")
            return

        bill = self._unpaid_bills[idx]
        payment = self.house.record_payment(bill, amount, date_paid)

        self.payments_listbox.insert(tk.END, str(payment))
        self._refresh_bills_ui()

        self.payment_amount_entry.delete(0, tk.END)
        self.payment_date_entry.delete(0, tk.END)

    # ---------------------------------------------------------------
    # Dashboards tab
    # ---------------------------------------------------------------
    def _build_dashboard_tab(self):
        frame = self.dashboard_tab

        top_box = ttk.Frame(frame)
        top_box.pack(fill="x", padx=10, pady=8)

        ttk.Label(top_box, text="Tenant:").grid(row=0, column=0, sticky="w", padx=5)
        self.dashboard_tenant_combo = ttk.Combobox(top_box, width=20, state="readonly")
        self.dashboard_tenant_combo.grid(row=0, column=1, padx=5)
        ttk.Button(top_box, text="Show Tenant Dashboard", command=self._show_tenant_dashboard).grid(
            row=0, column=2, padx=8)

        ttk.Button(top_box, text="Show Owner Dashboard", command=self._show_owner_dashboard).grid(
            row=0, column=3, padx=8)

        ttk.Label(top_box, text="Check overdue as of (YYYY-MM-DD):").grid(row=1, column=0, sticky="w", padx=5, pady=6)
        self.overdue_date_entry = ttk.Entry(top_box, width=15)
        self.overdue_date_entry.grid(row=1, column=1, padx=5)
        ttk.Button(top_box, text="Check Overdue Bills", command=self._check_overdue).grid(row=1, column=2, padx=8)

        output_box = ttk.LabelFrame(frame, text="Output")
        output_box.pack(fill="both", expand=True, padx=10, pady=8)
        self.dashboard_text = tk.Text(output_box, wrap="word")
        self.dashboard_text.pack(fill="both", expand=True, padx=5, pady=5)

    def _show_tenant_dashboard(self):
        name = self.dashboard_tenant_combo.get()
        if not name:
            messagebox.showerror("Missing info", "Select a tenant first.")
            return
        tenant = next((t for t in self._all_tenants if t.name == name), None)
        if tenant is None:
            return

        log = io.StringIO()
        with contextlib.redirect_stdout(log):
            self.house.print_tenant_dashboard(tenant)
        self._write_output(log.getvalue())

    def _show_owner_dashboard(self):
        log = io.StringIO()
        with contextlib.redirect_stdout(log):
            self.house.print_owner_dashboard()
        self._write_output(log.getvalue())

    def _check_overdue(self):
        date_text = self.overdue_date_entry.get().strip()
        if not date_text:
            messagebox.showerror("Missing info", "Enter a date to check against.")
            return

        log = io.StringIO()
        with contextlib.redirect_stdout(log):
            self.house.check_overdue_bills(date_text)
        output = log.getvalue().strip()
        self._write_output(output if output else "No overdue bills as of that date.")
        self._refresh_bills_ui()

    def _write_output(self, text):
        self.dashboard_text.delete("1.0", tk.END)
        self.dashboard_text.insert(tk.END, text)


def main():
    root = tk.Tk()
    app = BoardEaseApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()