"""BoardEase desktop dashboard. Run: python gui_app.py [--ledger path.xlsx]."""
import argparse
import calendar
import tkinter as tk
from datetime import date
from pathlib import Path
from tkinter import ttk, messagebox

from owner import Owner
from tenant import Tenant
from single_room import SingleRoom
from shared_room import SharedRoom
from utility_reading import UtilityReading
from boarding_house import BoardingHouse
from reports import generate_tenant_pdf, generate_monthly_bills_pdf, get_statement, tenant_months, month_label, open_pdf, print_pdf

from ui_components import RoundedButton, StatusBadge, BG, NAVY, INK, MUTED, BLUE, BORDER, COLORS


def format_currency(value):
    return f'₱{value:,.2f}'


def room_type(room):
    return type(room).__name__.replace('Room', '')


class FormDialog(tk.Toplevel):
    """A compact modal form with inline errors and one save action."""
    def __init__(self, app, title, subtitle, specs, on_submit, action='Save'):
        super().__init__(app.root)
        self.app, self.on_submit = app, on_submit
        self.fields, self.widgets = {}, {}
        self.title(title)
        self.configure(bg='white')
        self.resizable(False, False)
        self.transient(app.root)
        body = ttk.Frame(self, padding=24, style='Card.TFrame')
        body.pack(fill='both', expand=True)
        ttk.Label(body, text=title, style='Section.TLabel').grid(row=0, column=0, columnspan=2, sticky='w')
        ttk.Label(body, text=subtitle, style='Muted.TLabel', wraplength=440).grid(
            row=1, column=0, columnspan=2, sticky='w', pady=(5, 20))
        for row, (key, label, default, choices) in enumerate(specs, 2):
            ttk.Label(body, text=label, style='Card.TLabel').grid(row=row, column=0, sticky='w', padx=(0, 18), pady=7)
            var = tk.StringVar(value=default)
            widget = (ttk.Combobox(body, textvariable=var, values=choices, state='readonly', width=29)
                      if choices is not None else ttk.Entry(body, textvariable=var, width=32))
            widget.grid(row=row, column=1, sticky='ew', pady=7)
            self.fields[key], self.widgets[key] = var, widget
        self.error = tk.StringVar()
        ttk.Label(body, textvariable=self.error, foreground='#C3314A', background='white',
                  wraplength=440).grid(row=len(specs)+2, column=0, columnspan=2, sticky='w', pady=10)
        actions = ttk.Frame(body, style='Card.TFrame')
        actions.grid(row=len(specs)+3, column=0, columnspan=2, sticky='e')
        RoundedButton(actions, text='Cancel', command=self.destroy).pack(side='left', padx=8)
        RoundedButton(actions, text=action, command=self.submit, style='Primary.TButton').pack(side='left')
        self.bind('<Escape>', lambda e: self.destroy())
        self.bind('<Return>', lambda e: self.submit())
        self.update_idletasks()
        x = app.root.winfo_rootx() + (app.root.winfo_width() - self.winfo_width()) // 2
        y = app.root.winfo_rooty() + max(20, (app.root.winfo_height() - self.winfo_height()) // 2)
        self.geometry(f'+{max(0,x)}+{max(0,y)}')
        self.grab_set()
        next(iter(self.widgets.values())).focus_set()

    def submit(self):
        try:
            self.on_submit({key: var.get().strip() for key, var in self.fields.items()})
        except (ValueError, OSError) as error:
            self.error.set(self.app.friendly_error(error))
            return
        self.destroy()
        self.app.refresh()


class BoardEaseApp:
    PAGES = {'Dashboard': ('Overview of your boarding house', '⌂'),
             'Rooms & Tenants': ('Manage rooms, occupancy, and tenant records', '▦'),
             'Billing': ('Generate and manage monthly tenant bills', '▤'),
             'Payments': ('Record payments and track outstanding balances', '▣'),
             'Reports': ('Monthly billing notices for printing and room-to-room delivery', '▥')}

    def __init__(self, root, ledger_filepath=None):
        self.root = root
        root.title('BoardEase · Boarding House Management')
        root.geometry('1440x900')
        root.minsize(1100, 700)
        root.configure(bg=BG)
        self.owner = Owner('BoardEase', '')
        default_ledger = Path(__file__).with_name('billing_ledger.xlsx')
        if ledger_filepath is None and not default_ledger.is_file():
            raise FileNotFoundError('billing_ledger.xlsx was not found. Restore your workbook or explicitly select a new ledger with --ledger.')
        self.house = BoardingHouse(self.owner, ledger_filepath or default_ledger)
        self.current_page = 'Dashboard'
        self.notice = tk.StringVar(value='Your records are up to date.')
        self.billing_filter = tk.StringVar(value='All')
        self.billing_search = tk.StringVar()
        self.tenant_selection = tk.StringVar()
        self._style()
        self._shell()
        self.show_page('Dashboard')
        if self.house.ledger.backup_path:
            self.notice.set('Ledger upgraded. Original saved in backups/. Legacy payment totals preserved.')

    def _style(self):
        style = ttk.Style(self.root)
        style.theme_use('clam')
        style.configure('.', font=('Segoe UI', 10), foreground=INK)
        style.configure('TFrame', background=BG)
        style.configure('Card.TFrame', background='white')
        style.configure('TLabel', background=BG, foreground=INK)
        style.configure('Card.TLabel', background='white')
        style.configure('Muted.TLabel', background='white', foreground=MUTED)
        style.configure('Section.TLabel', background='white', font=('Segoe UI', 15, 'bold'))
        style.configure('TButton', padding=(12, 9), background='#F5F8FD', foreground='#235EAC',
                        bordercolor=BORDER, lightcolor=BORDER, darkcolor=BORDER, borderwidth=1)
        style.map('TButton', background=[('active', '#E6F0FF')])
        style.configure('Primary.TButton', background=BLUE, foreground='white', bordercolor=BLUE,
                        lightcolor=BLUE, darkcolor=BLUE)
        style.map('Primary.TButton', background=[('active', '#0964D5')], foreground=[('disabled', '#BAC8DC')])
        style.configure('Compact.TButton', padding=(8, 5))
        style.configure('TRadiobutton', background='white', padding=(4, 6))
        style.configure('Horizontal.TProgressbar', background=BLUE, troughcolor='#E7EFFA',
                        bordercolor='#E7EFFA', lightcolor=BLUE, darkcolor=BLUE)
        style.configure('TEntry', padding=8, fieldbackground='white', bordercolor=BORDER)
        style.configure('TCombobox', padding=7, fieldbackground='white', bordercolor=BORDER)
        style.map('TCombobox', fieldbackground=[('readonly', 'white')])
        style.configure('Treeview', background='white', fieldbackground='white', rowheight=34,
                        borderwidth=0, font=('Segoe UI', 10))
        style.configure('Treeview.Heading', background='#EDF3FA', font=('Segoe UI', 9, 'bold'),
                        relief='flat', padding=(4, 8))
        style.map('Treeview', background=[('selected', '#D9EBFF')], foreground=[('selected', '#143D6B')])

    def _shell(self):
        side = tk.Frame(self.root, bg=NAVY, width=244)
        side.pack(side='left', fill='y')
        side.pack_propagate(False)
        brand = tk.Frame(side, bg=NAVY)
        brand.pack(fill='x', padx=17, pady=(27, 24))
        tk.Label(brand, text='⌂', fg='#3293FF', bg=NAVY, font=('Segoe UI', 31, 'bold')).pack(side='left')
        tk.Label(brand, text='BoardEase', fg='white', bg=NAVY, font=('Segoe UI', 20, 'bold')).pack(side='left', padx=5)
        tk.Label(side, text='BOARDING HOUSE MANAGEMENT', bg=NAVY, fg='#9FB5D0',
                 font=('Segoe UI', 8)).pack(anchor='w', padx=24, pady=(0, 24))
        self.nav_buttons = {}
        for page, (_, icon) in self.PAGES.items():
            button = RoundedButton(side, text=f'{icon}    {page}', variant='nav',
                                   command=lambda name=page: self.show_page(name))
            button.pack(fill='x', padx=12, pady=4)
            self.nav_buttons[page] = button
        RoundedButton(side, text='↪    Exit', command=self.root.destroy, variant='nav').pack(
            side='bottom', fill='x', padx=12, pady=14)
        tk.Label(side, text=f'DATA FILE\n{self.house.ledger.filepath.name}', wraplength=182,
                 justify='left', bg=NAVY, fg='#9ECDFB', font=('Segoe UI', 10)).pack(
                     side='bottom', anchor='w', padx=24, pady=18)
        tk.Frame(side, bg='#365171', height=1).pack(side='bottom', fill='x', padx=24)
        shell = ttk.Frame(self.root)
        shell.pack(side='left', fill='both', expand=True)
        shell.columnconfigure(0, weight=1)
        shell.rowconfigure(0, weight=1)
        notice = ttk.Label(shell, textvariable=self.notice, foreground=MUTED, padding=(24, 9), wraplength=850)
        notice.grid(row=1, column=0, columnspan=2, sticky='ew')
        notice.bind('<Configure>', lambda e: notice.configure(wraplength=max(300,e.width-48)))
        self.canvas = tk.Canvas(shell, bg=BG, highlightthickness=0)
        self.page_scrollbar = ttk.Scrollbar(shell, orient='vertical', command=self.canvas.yview)
        self.page_scrollbar.grid(row=0, column=1, sticky='ns')
        self.canvas.grid(row=0, column=0, sticky='nsew')
        def scroll_visibility(first, last):
            self.page_scrollbar.set(first, last)
            if float(first) <= 0 and float(last) >= 1:
                self.page_scrollbar.grid_remove()
            else:
                self.page_scrollbar.grid()
        self.canvas.configure(yscrollcommand=scroll_visibility)
        self.content = ttk.Frame(self.canvas, padding=24)
        self.content_window = self.canvas.create_window(0, 0, window=self.content, anchor='nw')
        self.canvas.bind('<Configure>', lambda e: self.canvas.itemconfigure(self.content_window, width=e.width))
        self.content.bind('<Configure>', lambda e: self.canvas.configure(scrollregion=self.canvas.bbox('all')))
        self.root.bind('<MouseWheel>', self._scroll)

    def _scroll(self, event):
        if event.widget.winfo_toplevel() is not self.root or isinstance(event.widget, ttk.Combobox):
            return
        if isinstance(event.widget, ttk.Treeview) and len(event.widget.get_children()) > 20:
            return
        if self.content.winfo_height() > self.canvas.winfo_height():
            self.canvas.yview_scroll(int(-event.delta / 120), 'units')

    def show_page(self, page):
        self.current_page = page
        for name, button in self.nav_buttons.items():
            button.configure(selected=name == page)
        for child in self.content.winfo_children():
            child.destroy()
        header = ttk.Frame(self.content)
        header.pack(fill='x', pady=(0, 22))
        ttk.Label(header, text=page, font=('Segoe UI', 27, 'bold')).pack(anchor='w')
        ttk.Label(header, text=self.PAGES[page][0], foreground=MUTED, font=('Segoe UI', 11)).pack(anchor='w', pady=(2, 0))
        {'Dashboard': self._dashboard, 'Rooms & Tenants': self._rooms,
         'Billing': self._billing, 'Payments': self._payments, 'Reports': self._reports}[page]()
        self.canvas.yview_moveto(0)

    def refresh(self):
        self.show_page(self.current_page)

    @staticmethod
    def friendly_error(error):
        if isinstance(error, PermissionError):
            return 'Close the Excel workbook and try again. Your changes were not saved.'
        return str(error)

    def _card(self, parent, title=None, subtitle=None):
        border = tk.Frame(parent, bg=BORDER, padx=1, pady=1)
        body = ttk.Frame(border, padding=16, style='Card.TFrame')
        body.pack(fill='both', expand=True)
        if title:
            ttk.Label(body, text=title, style='Section.TLabel').pack(anchor='w')
        if subtitle:
            ttk.Label(body, text=subtitle, style='Muted.TLabel', wraplength=600).pack(anchor='w', pady=(3, 12))
        return border, body

    def _metrics(self, parent, metrics):
        grid = ttk.Frame(parent)
        grid.pack(fill='x', pady=(0, 16))
        for col in range(4):
            grid.columnconfigure(col, weight=1, uniform='metric')
        for index, (label, value, hint, color) in enumerate(metrics):
            bg, fg = COLORS[color]
            card = tk.Frame(grid, bg=bg, padx=15, pady=13, highlightbackground=BORDER, highlightthickness=1)
            card.grid(row=index//4, column=index%4, sticky='nsew', padx=(0 if index%4 == 0 else 6, 0),
                      pady=(0 if index < 4 else 8, 0))
            tk.Label(card, text=label, bg=bg, fg=fg, font=('Segoe UI', 10)).pack(anchor='w')
            tk.Label(card, text=str(value), bg=bg, fg=INK,
                     font=('Segoe UI', 17 if len(str(value)) < 12 else 13, 'bold')).pack(anchor='w', pady=(3, 2))
            tk.Label(card, text=hint, bg=bg, fg=MUTED, font=('Segoe UI', 9)).pack(anchor='w')

    def _table(self, parent, columns, widths, rows, empty='No records yet.', height=9):
        frame = ttk.Frame(parent, style='Card.TFrame')
        frame.pack(fill='x', pady=(8, 0))
        frame.columnconfigure(0, weight=1)
        tree = ttk.Treeview(frame, columns=columns, show='headings', height=1, selectmode='browse')
        tree.column_weights = widths
        for column in columns:
            tree.heading(column, text=column, anchor='w')
            tree.column(column, width=60, minwidth=25, stretch=False, anchor='w')
        tree.grid(row=0, column=0, sticky='ew')
        vertical = ttk.Scrollbar(frame, orient='vertical', command=tree.yview)
        tree.vertical_scrollbar = vertical
        tree.configure(yscrollcommand=vertical.set)
        def fit_columns(event):
            available = max(1, event.width-4)
            total_weight = sum(widths)
            sizes = [int(available*w/total_weight) for w in widths]
            sizes[-1] += available-sum(sizes)
            for column, size in zip(columns, sizes):
                tree.column(column, width=max(1,size), minwidth=1)
        tree.bind('<Configure>', fit_columns)
        for status, color in [('PAID','green'), ('PARTIAL','amber'), ('UNPAID','red'), ('OVERDUE','red')]:
            bg, fg = COLORS[color]
            tree.tag_configure(status, background=bg, foreground=fg)
        tree.tag_configure('even', background='#F7F9FC')
        self._fill_table(tree, rows)
        tree.empty_label = ttk.Label(frame, text=empty if not rows else '', style='Muted.TLabel', wraplength=680)
        tree.empty_label.grid(row=1, column=0, sticky='w', pady=(4, 0))
        return tree

    @staticmethod
    def _fill_table(tree, rows):
        tree.delete(*tree.get_children())
        tree.configure(height=max(1,min(20,len(rows))))
        if len(rows)>20:
            tree.vertical_scrollbar.grid(row=0, column=1, sticky='ns')
        else:
            tree.vertical_scrollbar.grid_remove()
        for index, (key, values, status) in enumerate(rows):
            tree.insert('', 'end', iid=str(key), values=values, tags=(status or ('even' if index%2 == 0 else ''),))

    def _bill_rows(self, bills, compact=False):
        return [(b.bill_id, (b.tenant.name, b.room_number, b.month, format_currency(b.get_total_amount()),
                            b.due_date, format_currency(b.balance), b.get_status()) if compact else
                 (b.tenant.name, b.room_number, b.month, format_currency(b.rent_share),
                  format_currency(b.utility_share), format_currency(b.get_total_amount()),
                  format_currency(b.amount_paid), format_currency(b.balance), b.due_date, b.get_status()),
                 b.get_status()) for b in bills]

    def _dashboard(self):
        h, s = self.house, self.house.summary()
        vacant = sum(not r.tenants for r in h.rooms)
        self._metrics(self.content, [('Total Rooms', len(h.rooms), f'{vacant} vacant rooms', 'blue'),
            ('Total Tenants', len(h.tenants), 'Currently registered', 'blue'),
            ('Unpaid Bills', s['unpaid'], 'Includes partial & overdue', 'red'),
            ('Paid Bills', s['paid'], 'Fully settled', 'green'),
            ('Total Billed', format_currency(s['total_billed']), 'All billing periods', 'blue'),
            ('Total Collected', format_currency(s['total_paid']), 'All billing periods', 'blue'),
            ('Outstanding Balance', format_currency(s['balance']), 'Total remaining', 'amber'),
            ('Overdue Bills', s['overdue'], 'Past their due date', 'red')])
        layout = ttk.Frame(self.content)
        layout.pack(fill='both', expand=True)
        layout.columnconfigure(0, weight=3, minsize=450)
        layout.columnconfigure(1, weight=1, minsize=250)
        card, body = self._card(layout, 'Recent Billing', 'Latest tenant bills and payment status')
        card.grid(row=0, column=0, sticky='nsew', padx=(0, 14))
        RoundedButton(body, text='↻  Refresh', command=self.refresh).pack(anchor='e')
        self._table(body, ['Tenant','Room','Month','Total','Due Date','Balance','Status'],
                    [175,65,100,110,110,110,95], self._bill_rows(list(reversed(h.bills))[:10], True),
                    'No bills generated yet. Add a room and tenant to get started.', height=7)
        RoundedButton(body, text='View all bills  →', command=lambda: self.show_page('Billing')).pack(anchor='e', pady=(10,0))
        right = ttk.Frame(layout)
        right.grid(row=0, column=1, sticky='nsew')
        card, body = self._card(right, 'Quick Actions')
        card.pack(fill='x', pady=(0,12))
        buttons = ttk.Frame(body, style='Card.TFrame')
        buttons.pack(fill='x', pady=(8, 0))
        for column in range(2):
            buttons.columnconfigure(column, weight=1, uniform='quick')
        for index, (title, command) in enumerate([('Add Room', self.add_room_dialog), ('Add Tenant', self.add_tenant_dialog),
                                ('Generate Bills', self.generate_bills_dialog),
                                ('Record Payment', lambda: self.show_page('Payments'))]):
            RoundedButton(buttons, text=title, command=command, style='Compact.TButton').grid(
                row=index//2, column=index%2, sticky='ew', padx=2, pady=3)
        card, body = self._card(right, 'Collection Overview')
        card.pack(fill='x', pady=(0,12))
        percent = 100*s['total_paid']/s['total_billed'] if s['total_billed'] else 0
        ttk.Label(body, text=f'{percent:.0f}% collected', font=('Segoe UI', 20, 'bold'), style='Card.TLabel').pack(anchor='w')
        ttk.Progressbar(body, value=min(100, percent)).pack(fill='x', pady=(8,4))
        ttk.Label(body, text=f"{s['paid']} paid  ·  {s['partial']} partial  ·  {s['overdue']} overdue",
                  style='Muted.TLabel', wraplength=240).pack(anchor='w')
        card, body = self._card(right, 'Overdue Bills')
        card.pack(fill='x')
        overdue = h.filter_bills('Overdue')
        for bill in overdue[:2]:
            ttk.Label(body, text=f'{bill.tenant.name}\nRoom {bill.room_number} · {format_currency(bill.balance)}',
                      foreground='#C3314A', background='white', wraplength=230).pack(anchor='w', pady=7)
        if not overdue:
            ttk.Label(body, text='No overdue bills. You’re up to date.', style='Muted.TLabel', wraplength=220).pack(pady=10)

    def _rooms(self):
        rooms = self.house.rooms
        occupied = sum(bool(r.tenants) for r in rooms)
        self._metrics(self.content, [('Total Rooms', len(rooms), 'All rooms', 'blue'),
            ('Occupied Rooms', occupied, 'With assigned tenants', 'blue'),
            ('Vacant Rooms', len(rooms)-occupied, 'Ready for a tenant', 'blue'),
            ('Available Spaces', sum(r.get_max_occupancy()-len(r.tenants) for r in rooms), 'Across all rooms', 'blue')])
        card, body = self._card(self.content, 'Rooms', 'Select a row to see occupants or edit room settings.')
        card.pack(fill='x', pady=(0,16))
        actions = ttk.Frame(body, style='Card.TFrame')
        actions.pack(fill='x', pady=(0,6))
        RoundedButton(actions, text='Add Room', style='Primary.TButton', command=self.add_room_dialog).pack(side='left', padx=(0,8))
        RoundedButton(actions, text='Edit Room', command=self.edit_room_dialog).pack(side='left')
        rows = [(i, (r.room_number, room_type(r), ', '.join(t.name for t in r.tenants) or '—',
                     len(r.tenants), r.get_max_occupancy(), format_currency(r.base_rent),
                     'Vacant' if not r.tenants else 'Full' if len(r.tenants)==r.get_max_occupancy() else 'Available'), '')
                for i,r in enumerate(rooms)]
        self.rooms_table = self._table(body, ['Room','Type','Tenant','Occupancy','Capacity','Rent','Status'],
                                      [60,75,230,85,80,110,85], rows, 'No rooms yet. Add your first room.')
        self.room_details = tk.StringVar(value='')
        ttk.Label(body, textvariable=self.room_details, style='Muted.TLabel', wraplength=800).pack(anchor='w', pady=(8,0))
        self.rooms_table.bind('<<TreeviewSelect>>', self._room_selection)
        card, body = self._card(self.content, 'Tenants', 'Edit details, transfer rooms, or remove a tenant while preserving billing history.')
        card.pack(fill='x')
        actions = ttk.Frame(body, style='Card.TFrame')
        actions.pack(fill='x', pady=(0,6))
        for title, command, style in [('Add Tenant', self.add_tenant_dialog, 'Primary.TButton'),
            ('Edit Tenant', self.edit_tenant_dialog, 'TButton'), ('Transfer', self.transfer_tenant_dialog, 'TButton'),
            ('Remove', self.remove_tenant, 'Danger.TButton')]:
            RoundedButton(actions, text=title, command=command, style=style).pack(side='left', padx=(0,8))
        self.visible_tenants = self.house.tenants
        rows = [(i, (t.name,t.contact_number,t.assigned_room.room_number,room_type(t.assigned_room)), '')
                for i,t in enumerate(self.visible_tenants)]
        self.tenants_table = self._table(body, ['Tenant','Contact','Room','Room Type'], [320,180,90,120], rows,
                                        'No active tenants registered yet.')
        self.tenant_details = tk.StringVar()
        ttk.Label(body, textvariable=self.tenant_details, style='Muted.TLabel', wraplength=800).pack(anchor='w', pady=(8,0))
        self.tenants_table.bind('<<TreeviewSelect>>', self._tenant_selection)
        if self.house.archived_tenants:
            ttk.Label(body, text=f'{len(self.house.archived_tenants)} removed tenant(s) retained in Billing, Payments, and Reports.',
                      style='Muted.TLabel', wraplength=800).pack(anchor='w', pady=8)

    def _room_selection(self, event=None):
        selection = self.rooms_table.selection()
        if selection:
            room = self.house.rooms[int(selection[0])]
            self.room_details.set(f'Room {room.room_number}: '+(', '.join(t.name for t in room.tenants) or 'No tenants assigned'))

    def _selected_tenant(self):
        selection = self.tenants_table.selection()
        return self.visible_tenants[int(selection[0])] if selection else None

    def _tenant_selection(self, event=None):
        tenant = self._selected_tenant()
        if tenant:
            self.tenant_details.set(f'{tenant.name} · {tenant.contact_number} · Room {tenant.assigned_room.room_number}')

    def edit_room_dialog(self):
        selected = self.rooms_table.selection()
        if not selected:
            self.notice.set('Select a room to edit.')
            return
        room = self.house.rooms[int(selected[0])]
        def save(values):
            try:
                capacity = int(values['capacity'])
            except ValueError:
                raise ValueError('Capacity must be a positive whole number.') from None
            self.house.edit_room(room, values['rent'], capacity)
            self.notice.set(f'Room {room.room_number} updated. Existing bills retain their recorded amounts.')
        return FormDialog(self, f'Edit Room {room.room_number}', 'Changes apply to future bills and room availability.',
                          [('rent','Monthly rent (₱)',str(room.base_rent),None),
                           ('capacity','Capacity',str(room.get_max_occupancy()),None)], save)

    def edit_tenant_dialog(self):
        tenant = self._selected_tenant()
        if not tenant:
            self.notice.set('Select a tenant to edit.')
            return
        def save(values):
            self.house.edit_tenant(tenant, values['name'], values['contact'])
            self.notice.set('Tenant details updated.')
        return FormDialog(self, 'Edit Tenant', 'Update the tenant details used throughout BoardEase.',
                          [('name','Full name',tenant.name,None), ('contact','Contact number',tenant.contact_number,None)], save)

    def transfer_tenant_dialog(self):
        tenant = self._selected_tenant()
        if not tenant:
            self.notice.set('Select a tenant to transfer.')
            return
        rooms = [r for r in self.house.rooms if r is not tenant.assigned_room and len(r.tenants)<r.get_max_occupancy()]
        if not rooms:
            self.notice.set('No other rooms have an available space.')
            return
        choices = [f'{r.room_number} · {room_type(r)}' for r in rooms]
        def save(values):
            self.house.transfer_tenant(tenant, rooms[choices.index(values['room'])])
            self.notice.set('Tenant transferred. Existing bills retain their original room.')
        return FormDialog(self, 'Transfer Tenant', tenant.name,
                          [('room','New room',choices[0],choices)], save, 'Transfer')

    def remove_tenant(self):
        tenant = self._selected_tenant()
        if not tenant:
            self.notice.set('Select a tenant to remove.')
            return
        if not messagebox.askyesno('Remove tenant from room?',
                f'Remove {tenant.name} from the active tenant list? Their bills and payments will be preserved.', parent=self.root):
            return
        try:
            self.house.remove_tenant(tenant)
        except (ValueError,OSError) as error:
            self.notice.set(self.friendly_error(error))
            return
        self.notice.set('Tenant removed from the room. Billing history has been preserved.')
        self.refresh()

    def _billing(self):
        s = self.house.summary()
        self._metrics(self.content, [('Total Billed', format_currency(s['total_billed']), 'All billing periods', 'blue'),
            ('Unpaid Bills', s['unpaid'], 'All outstanding bills', 'red'),
            ('Partial Bills', s['partial'], 'Includes overdue partial bills', 'amber'),
            ('Outstanding', format_currency(s['balance']), 'Remaining to collect', 'blue')])
        actions = ttk.Frame(self.content)
        actions.pack(fill='x', pady=(0,16))
        for title, command, style in [('Generate Bill', self.generate_bills_dialog, 'Primary.TButton'),
                ('Check Overdue', self.overdue_dialog, 'TButton')]:
            RoundedButton(actions, text=title, command=command, style=style).pack(side='left', padx=(0,8))
        card, body = self._card(self.content, 'Tenant Billings', 'Select a bill to view its details or record a payment')
        card.pack(fill='both', expand=True)
        filters = ttk.Frame(body, style='Card.TFrame')
        filters.pack(fill='x', pady=(0,8))
        for name in ('All', 'Paid', 'Partial', 'Unpaid', 'Overdue'):
            ttk.Radiobutton(filters, text=name, variable=self.billing_filter, value=name,
                            command=self.refresh_billing_table).pack(side='left', padx=(0,12))
        search = ttk.Frame(body, style='Card.TFrame')
        search.pack(fill='x')
        ttk.Label(search, text='Search tenant or room', style='Card.TLabel').pack(side='left', padx=(0,12))
        entry = ttk.Entry(search, textvariable=self.billing_search, width=34)
        entry.pack(side='left')
        entry.bind('<KeyRelease>', lambda e: self.refresh_billing_table())
        self.billing_table = self._table(body, ['Tenant','Room','Month','Rent','Utilities','Total','Paid','Balance','Due Date','Status'],
                        [190,65,100,105,105,110,105,110,110,100], [], height=11)
        self.billing_table.bind('<<TreeviewSelect>>', self._bill_details)
        self.bill_detail = tk.StringVar(value='Select a billing row to see the full tenant name and balance.')
        ttk.Label(body, textvariable=self.bill_detail, style='Muted.TLabel', wraplength=850).pack(anchor='w', pady=12)
        bill_actions = ttk.Frame(body, style='Card.TFrame')
        bill_actions.pack(fill='x')
        RoundedButton(bill_actions, text='View / Print Bill', command=self._view_selected_bill).pack(side='left', padx=(0,8))
        RoundedButton(bill_actions, text='Record Payment', command=self._pay_selected, style='Primary.TButton').pack(side='left')
        self.refresh_billing_table()

    def refresh_billing_table(self):
        bills = self.house.filter_bills(self.billing_filter.get(), self.billing_search.get())
        self._fill_table(self.billing_table, self._bill_rows(list(reversed(bills))))
        self.billing_table.empty_label.configure(text='' if bills else 'No bills match this view.')
        self.bill_detail.set(f'{len(bills)} bill(s) shown. Unpaid includes partial and overdue balances.')

    def _selected_bill(self):
        selection = self.billing_table.selection()
        return next((b for b in self.house.bills if selection and b.bill_id == selection[0]), None)

    def _bill_details(self, event=None):
        bill = self._selected_bill()
        if bill:
            self.bill_detail.set(f'{bill.tenant.name} · Room {bill.room_number} · {bill.month}\n'
                                 f'Total {format_currency(bill.get_total_amount())}   |   Paid {format_currency(bill.amount_paid)}'
                                 f'   |   Balance {format_currency(bill.balance)}   |   {bill.get_status()}\n'
                                 + '   ·   '.join(f'{label}: {format_currency(amount)}' for label,amount in bill.charge_lines()))

    def _view_selected_bill(self):
        bill = self._selected_bill()
        if not bill:
            self.notice.set('Select a bill to view or print.')
            return
        self.tenant_selection.set(bill.tenant.name)
        self.show_page('Reports')
        self.report_month.set(month_label(bill.month))
        self._refresh_report()

    def _pay_selected(self):
        bill = self._selected_bill()
        if not bill or bill.paid:
            self.notice.set('Select a bill with an outstanding balance first.')
            return
        self.show_page('Payments')
        self.payment_combo.current(self.unpaid_bills.index(bill))
        self._payment_summary()

    def _payments(self):
        s = self.house.summary()
        self._metrics(self.content, [('Total Collected', format_currency(s['total_paid']), 'All billing periods', 'green'),
            ('Payments Recorded', len(self.house.payments), 'Includes legacy totals', 'blue'),
            ('Partial Bills', s['partial'], 'Payments still outstanding', 'amber'),
            ('Outstanding Balance', format_currency(s['balance']), 'All remaining balances', 'red')])
        card, body = self._card(self.content, 'Record Payment', 'Choose an outstanding bill, then enter the amount received')
        card.pack(fill='x', pady=(0,16))
        self.unpaid_bills = [b for b in self.house.bills if not b.paid]
        self.payment_combo = ttk.Combobox(body, state='readonly', values=[
            f'{b.tenant.name} · Room {b.room_number} · {b.month} · {format_currency(b.balance)}'
            for b in self.unpaid_bills])
        self.payment_combo.pack(fill='x', pady=(0,12))
        self.payment_combo.bind('<<ComboboxSelected>>', self._payment_summary)
        self.payment_summary = tk.StringVar()
        ttk.Label(body, textvariable=self.payment_summary, style='Muted.TLabel', wraplength=950,
                  font=('Segoe UI', 11)).pack(anchor='w', pady=(0,14))
        form = ttk.Frame(body, style='Card.TFrame')
        form.pack(fill='x')
        ttk.Label(form, text='Amount received (₱)', style='Card.TLabel').grid(row=0,column=0,sticky='w')
        ttk.Label(form, text='Date paid (YYYY-MM-DD)', style='Card.TLabel').grid(row=0,column=1,sticky='w',padx=16)
        self.payment_amount = tk.StringVar()
        self.payment_date = tk.StringVar(value=date.today().isoformat())
        ttk.Entry(form, textvariable=self.payment_amount, width=22).grid(row=1,column=0,sticky='w',pady=6)
        ttk.Entry(form, textvariable=self.payment_date, width=22).grid(row=1,column=1,sticky='w',padx=16,pady=6)
        button = RoundedButton(form, text='Record Payment', command=self.record_payment, style='Primary.TButton')
        button.grid(row=1,column=2,sticky='w',padx=8)
        self.payment_error = tk.StringVar()
        ttk.Label(body, textvariable=self.payment_error, foreground='#C3314A', background='white').pack(anchor='w')
        if self.unpaid_bills:
            self.payment_combo.current(0)
        else:
            button.state(['disabled'])
        self._payment_summary()
        card, body = self._card(self.content, 'Payment History',
                               'Balance and status after each payment. Legacy total = combined payments from the original ledger.')
        card.pack(fill='both', expand=True)
        rows = [(i, (p.bill.tenant.name, p.bill.room_number, p.bill.month, format_currency(p.amount_paid),
                     p.date_paid or 'Not recorded', format_currency(p.remaining_balance), p.status, p.source), p.status)
                for i, p in reversed(list(enumerate(self.house.payments)))]
        self._table(body, ['Tenant','Room','Month','Amount','Date Paid','Balance After','Status','Record Type'],
                    [210,65,100,120,120,130,95,130], rows, 'No payments recorded yet.', height=8)

    def _payment_summary(self, event=None):
        index = self.payment_combo.current()
        if index < 0:
            self.payment_summary.set('No unpaid bills. All generated bills are settled.')
            return
        b = self.unpaid_bills[index]
        self.payment_summary.set(f'{b.tenant.name}   ·   Room {b.room_number}   ·   Billing month {b.month}\n'
            f'Total bill: {format_currency(b.get_total_amount())}     Previously paid: {format_currency(b.amount_paid)}\n'
            f'Remaining balance: {format_currency(b.balance)}     Due: {b.due_date}     Status: {b.get_status()}')

    def record_payment(self):
        index = self.payment_combo.current()
        if index < 0:
            self.payment_error.set('Select an unpaid bill first.')
            return
        try:
            bill = self.unpaid_bills[index]
            payment = self.house.record_payment(bill, self.payment_amount.get(), self.payment_date.get())
        except (ValueError, OSError) as error:
            self.payment_error.set(self.friendly_error(error))
            return
        self.notice.set(f'Payment of {format_currency(payment.amount_paid)} saved. Remaining: {format_currency(bill.balance)}.')
        self.refresh()

    def _reports(self):
        card, body = self._card(self.content, 'Tenant Billing Notice',
                               'Select a tenant and billing month to prepare an A4 PDF for delivery.')
        card.pack(fill='x', pady=(0,16))
        selectors = ttk.Frame(body, style='Card.TFrame')
        selectors.pack(fill='x')
        selectors.columnconfigure(0, weight=3)
        selectors.columnconfigure(1, weight=2)
        ttk.Label(selectors, text='Tenant', style='Card.TLabel').grid(row=0, column=0, sticky='w')
        ttk.Label(selectors, text='Billing month', style='Card.TLabel').grid(row=0, column=1, sticky='w', padx=(16,0))
        names = [t.name for t in self.house.all_tenants]
        self.report_tenant_combo = ttk.Combobox(selectors, state='readonly', textvariable=self.tenant_selection,
                                               values=names, width=32)
        self.report_tenant_combo.grid(row=1, column=0, sticky='ew', pady=7)
        self.report_tenant_combo.bind('<<ComboboxSelected>>', lambda e: self._report_months())
        self.report_month = tk.StringVar()
        self.report_month_combo = ttk.Combobox(selectors, state='readonly', textvariable=self.report_month, width=24)
        self.report_month_combo.grid(row=1, column=1, sticky='ew', padx=(16,0), pady=7)
        self.report_month_combo.bind('<<ComboboxSelected>>', lambda e: self._refresh_report())
        actions = ttk.Frame(body, style='Card.TFrame')
        actions.pack(fill='x', pady=(12,0))
        self.generate_pdf_button = RoundedButton(actions, text='Generate PDF', command=self.generate_report,
                                             style='Primary.TButton')
        self.generate_pdf_button.pack(side='left', padx=(0,8))
        self.open_pdf_button = RoundedButton(actions, text='Open PDF', command=self.open_report, state='disabled')
        self.open_pdf_button.pack(side='left', padx=(0,8))
        self.print_pdf_button = RoundedButton(actions, text='Print PDF', command=self.print_report, state='disabled')
        self.print_pdf_button.pack(side='left', padx=(0,8))
        self.bulk_pdf_button = RoundedButton(actions, text='Generate All Bills for Month', command=self.generate_bulk_report)
        self.bulk_pdf_button.pack(side='left')
        self.report_result = tk.StringVar()
        ttk.Label(body, textvariable=self.report_result, style='Muted.TLabel', wraplength=750).pack(anchor='w', pady=(12,0))
        self.report_area = ttk.Frame(self.content)
        self.report_area.pack(fill='both', expand=True)
        self.generated_pdf = None
        if self.tenant_selection.get() not in names:
            self.tenant_selection.set(names[0] if names else '')
        self._report_months()

    def _report_tenant(self):
        return self.house.find_tenant(self.tenant_selection.get())

    def _report_months(self):
        tenant = self._report_tenant()
        try:
            self.report_month_map = {month_label(m): m for m in self.house.billing_months()}
        except ValueError as error:
            self.report_month_map = {}
            self.notice.set(str(error))
        choices = list(self.report_month_map)
        self.report_month_combo.configure(values=choices)
        if self.report_month.get() not in choices:
            self.report_month.set(choices[0] if choices else '')
        self._refresh_report()

    def _invalidate_pdf(self, *args):
        self.generated_pdf = None
        self.open_pdf_button.state(['disabled'])
        self.print_pdf_button.state(['disabled'])
        self.report_result.set('')

    def _refresh_report(self):
        self._invalidate_pdf()
        for widget in self.report_area.winfo_children():
            widget.destroy()
        self.generate_pdf_button.state(['disabled'])
        tenant = self._report_tenant()
        month = self.report_month_map.get(self.report_month.get())
        self.bulk_pdf_button.state(['!disabled' if month else 'disabled'])
        if tenant is None or not month:
            ttk.Label(self.report_area, text='No billing statement available. Select a tenant with a generated monthly bill.',
                      padding=20, wraplength=700).pack(anchor='w')
            return
        try:
            statement = get_statement(self.house, tenant, month)
        except ValueError as error:
            ttk.Label(self.report_area, text=str(error), padding=20, wraplength=700).pack(anchor='w')
            return
        self.generate_pdf_button.state(['!disabled'])
        bill = statement.bill
        card, body = self._card(self.report_area, 'Statement Details',
                               f'Room {bill.room_number}  ·  {month_label(month)}  ·  Due {bill.due_date}')
        card.pack(fill='x', pady=(0,16))
        ttk.Label(body, text=tenant.name, style='Section.TLabel', wraplength=720).pack(anchor='w', pady=(0,12))
        rows = bill.charge_lines() + [('Current Month Total', bill.get_total_amount()),
                                     ('Amount Paid (selected bill)', bill.amount_paid)]
        if statement.previous_balance:
            rows.append(('Previous Balance (earlier months)', statement.previous_balance))
        rows.append(('Remaining Balance / Total Amount Due', statement.total_due))
        self._table(body, ['Description', 'Amount'], [470,220],
                    [(i, (label, format_currency(amount)), '') for i, (label, amount) in enumerate(rows)], height=len(rows))
        StatusBadge(body, statement.status).pack(anchor='w', pady=(12,0))
        if statement.previous_balance:
            ttk.Label(body, text='Earlier unpaid balances are included as they stand today and retain their original due dates.',
                      style='Muted.TLabel', wraplength=730).pack(anchor='w', pady=(8,0))
        ttk.Label(self.report_area, text='A4 portrait · Black-and-white friendly · Signature and date-received lines included',
                  foreground=MUTED, wraplength=750).pack(anchor='w')

    def generate_report(self):
        self._invalidate_pdf()
        try:
            tenant = self._report_tenant()
            month = self.report_month_map.get(self.report_month.get())
            if not tenant or not month:
                raise ValueError('Select a tenant and a billing month first.')
            self.generated_pdf = generate_tenant_pdf(self.house, tenant, month)
        except (ValueError, OSError) as error:
            self.report_result.set(f'PDF was not generated: {error}')
            return
        self.report_result.set(f'PDF generated successfully.\nSaved to: {self.generated_pdf}')
        self.notice.set(f'Tenant PDF saved: {self.generated_pdf}')
        self.open_pdf_button.state(['!disabled'])
        self.print_pdf_button.state(['!disabled'])

    def generate_bulk_report(self):
        self._invalidate_pdf()
        try:
            month = self.report_month_map.get(self.report_month.get())
            if not month:
                raise ValueError('Select a billing month first.')
            self.generated_pdf = generate_monthly_bills_pdf(self.house, month)
        except (ValueError, OSError) as error:
            self.report_result.set(f'PDF was not generated: {error}')
            return
        self.report_result.set(f'Monthly PDF generated successfully. One page per billed tenant.\nSaved to: {self.generated_pdf}')
        self.notice.set(f'Monthly tenant bills saved: {self.generated_pdf}')
        self.open_pdf_button.state(['!disabled'])
        self.print_pdf_button.state(['!disabled'])

    def open_report(self):
        if not self.generated_pdf:
            return
        try:
            open_pdf(self.generated_pdf)
        except (ValueError, OSError) as error:
            self.report_result.set(str(error))

    def print_report(self):
        if not self.generated_pdf:
            return
        try:
            print_pdf(self.generated_pdf)
            self.report_result.set('Print request sent to your default PDF application. Check its print workflow.\n'
                                   f'PDF: {self.generated_pdf}')
        except (ValueError, OSError) as error:
            self.report_result.set(str(error))

    def add_room_dialog(self):
        def save(values):
            if values['type'] == 'Shared':
                try:
                    capacity = int(values['capacity'])
                except ValueError:
                    raise ValueError('Shared capacity must be a positive whole number.') from None
                room = SharedRoom(values['number'], values['rent'], capacity)
            else:
                room = SingleRoom(values['number'], values['rent'])
            self.house.add_room(room)
            self.notice.set(f'Room {room.room_number} added.')
        form = FormDialog(self, 'Add Room', 'Set up the room and its monthly rent.', [
            ('number','Room number','',None), ('type','Room type','Single',['Single','Shared']),
            ('rent','Base rent (₱)','',None), ('capacity','Shared capacity','2',None)], save, 'Add Room')
        def toggle(*args):
            form.widgets['capacity'].configure(state='normal' if form.fields['type'].get() == 'Shared' else 'disabled')
        form.fields['type'].trace_add('write', toggle)
        toggle()
        return form

    def add_tenant_dialog(self):
        rooms = [r for r in self.house.rooms if len(r.tenants) < r.get_max_occupancy()]
        if not rooms:
            self.notice.set('No available spaces. Add a room before adding a tenant.')
            return
        choices = [f'{r.room_number} · {room_type(r)} · {r.get_max_occupancy()-len(r.tenants)} space(s) available' for r in rooms]
        def save(values):
            if values['room'] not in choices:
                raise ValueError('Select an available room.')
            self.house.add_tenant(Tenant(values['name'], values['contact']), rooms[choices.index(values['room'])])
            self.notice.set(f"Tenant {values['name']} added and assigned to a room.")
        return FormDialog(self, 'Add Tenant', 'Only rooms with available spaces are listed.', [
            ('name','Full name','',None), ('contact','Contact number','',None),
            ('room','Assign to room',choices[0],choices)], save, 'Add Tenant')

    def generate_bills_dialog(self):
        rooms = [r for r in self.house.rooms if r.tenants]
        if not rooms:
            self.notice.set('Add a tenant to a room before generating bills.')
            return
        choices = [f'{r.room_number} · {len(r.tenants)} tenant(s)' for r in rooms]
        today = date.today()
        last_day = date(today.year, today.month, calendar.monthrange(today.year, today.month)[1])
        def save(values):
            if values['room'] not in choices:
                raise ValueError('Select an occupied room.')
            try:
                numbers = [float(values[k]) for k in ('electricity', 'water', 'electricity_rate', 'water_rate')]
            except ValueError:
                raise ValueError('Utility usage and rates must be numbers.') from None
            reading = UtilityReading(rooms[choices.index(values['room'])], values['month'], *numbers)
            bills = self.house.generate_bills_for_room(reading, values['due'])
            self.notice.set(f'{len(bills)} monthly bill(s) generated and saved.')
        return FormDialog(self, 'Generate Monthly Bills', 'Rent and utilities are divided equally among current occupants.', [
            ('room','Room',choices[0],choices), ('month','Month (YYYY-MM)',today.strftime('%Y-%m'),None),
            ('electricity','Electricity usage (kWh)','0',None), ('water','Water usage (m³)','0',None),
            ('electricity_rate','Electricity rate (₱/kWh)','12',None), ('water_rate','Water rate (₱/m³)','30',None),
            ('due','Due date (YYYY-MM-DD)',last_day.isoformat(),None)], save, 'Generate Bills')

    def overdue_dialog(self):
        def check(values):
            bills = self.house.check_overdue_bills(values['date'], send=False)
            self._results_dialog('Overdue Bills', f"Outstanding bills as of {values['date']}",
                ['Tenant','Room','Month','Balance','Due Date'],
                [(i, (b.tenant.name,b.room_number,b.month,format_currency(b.balance),b.due_date),'OVERDUE')
                 for i,b in enumerate(bills)], 'No overdue bills as of this date.')
        return FormDialog(self, 'Check Overdue Bills', 'Choose the date to check outstanding balances against.',
                          [('date','As of (YYYY-MM-DD)',date.today().isoformat(),None)], check, 'Check Overdue')

    def _results_dialog(self, title, subtitle, columns, rows, empty):
        window = tk.Toplevel(self.root)
        window.title(title)
        window.geometry('850x450')
        window.transient(self.root)
        window.configure(bg='white')
        body = ttk.Frame(window, padding=20, style='Card.TFrame')
        body.pack(fill='both', expand=True)
        ttk.Label(body, text=title, style='Section.TLabel').pack(anchor='w')
        ttk.Label(body, text=subtitle, style='Muted.TLabel', wraplength=780).pack(anchor='w', pady=8)
        widths = [190,580] if len(columns) == 2 else [220,90,110,150,130]
        self._table(body, columns, widths, rows, empty)
        RoundedButton(body, text='Close', command=window.destroy).pack(anchor='e', pady=(10,0))


def main():
    parser = argparse.ArgumentParser(description='BoardEase desktop application')
    parser.add_argument('--ledger', type=Path, default=None)
    args = parser.parse_args()
    root = tk.Tk()
    try:
        BoardEaseApp(root, args.ledger)
    except Exception as error:
        root.withdraw()
        messagebox.showerror('BoardEase could not open the ledger',
                             f'{error}\n\nCheck the selected workbook and close it in Excel before trying again.', parent=root)
        root.destroy()
        return
    root.mainloop()


if __name__ == '__main__':
    main()
