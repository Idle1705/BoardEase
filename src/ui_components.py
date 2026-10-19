"""Small native Tk components shared by every BoardEase page."""
import tkinter as tk
from tkinter import ttk, font as tkfont

BG = '#F3F6FB'
NAVY = '#132E4F'
INK = '#172B44'
MUTED = '#64748B'
BLUE = '#2463DC'
BORDER = '#DCE4EF'
COLORS = {'blue': ('#EDF3FC', BLUE), 'green': ('#EAF6EF', '#217447'),
          'amber': ('#FFF6E7', '#956112'), 'red': ('#FCEFF0', '#B43143')}


class RoundedButton(tk.Canvas):
    """A focusable, keyboard-operable button with consistent rounded styling."""
    def __init__(self, parent, text='', command=None, style='TButton', state='normal', variant=None, **kwargs):
        self.text, self.command = text, command
        self.variant = variant or ('primary' if style.startswith('Primary') else
                                   'danger' if style.startswith('Danger') else 'secondary')
        self.compact = style.startswith('Compact')
        self.disabled = state == 'disabled'
        self.hovered = self.pressed = self.focused = self.selected = False
        self.text_font = tkfont.Font(family='Segoe UI', size=9 if self.compact else 10, weight='bold' if self.variant=='primary' else 'normal')
        try:
            background = parent.cget('background')
        except tk.TclError:
            background = ttk.Style(parent).lookup(parent.cget('style') or 'TFrame', 'background') or BG
        super().__init__(parent, background=background, width=self.text_font.measure(text)+(24 if self.compact else 32),
                         height=36 if self.compact else 40, highlightthickness=0, bd=0,
                         takefocus=not self.disabled, cursor='hand2', **kwargs)
        self.bind('<Configure>', lambda e: self._draw())
        self.bind('<Enter>', lambda e: self._hover(True))
        self.bind('<Leave>', lambda e: self._hover(False))
        self.bind('<ButtonPress-1>', self._press)
        self.bind('<ButtonRelease-1>', self._release)
        self.bind('<FocusIn>', lambda e: self._focus(True))
        self.bind('<FocusOut>', lambda e: self._focus(False))
        self.bind('<Return>', self._key)
        self.bind('<space>', self._key)

    def _hover(self, hovered):
        self.hovered = hovered
        if not hovered:
            self.pressed = False
        self._draw()

    def _focus(self, focused):
        self.focused = focused
        self._draw()

    def _press(self, event):
        if not self.disabled:
            self.focus_set()
            self.pressed = True
            self._draw()

    def _release(self, event):
        should_invoke = self.pressed and 0 <= event.x < self.winfo_width() and 0 <= event.y < self.winfo_height()
        self.pressed = False
        self._draw()
        if should_invoke:
            self.invoke()

    def _key(self, event):
        self.invoke()
        return 'break'

    def invoke(self):
        if not self.disabled and self.command:
            return self.command()

    def state(self, statespec=None):
        if statespec:
            if 'disabled' in statespec:
                self.disabled = True
            if '!disabled' in statespec:
                self.disabled = False
            super().configure(takefocus=not self.disabled, cursor='arrow' if self.disabled else 'hand2')
            self._draw()
        return ('disabled',) if self.disabled else ()

    def configure(self, cnf=None, **kwargs):
        if cnf:
            kwargs.update(cnf)
        if 'text' in kwargs:
            self.text = kwargs.pop('text')
        if 'command' in kwargs:
            self.command = kwargs.pop('command')
        if 'selected' in kwargs:
            self.selected = kwargs.pop('selected')
        if 'state' in kwargs:
            self.state(['disabled' if kwargs.pop('state') == 'disabled' else '!disabled'])
        if kwargs:
            super().configure(**kwargs)
        self._draw()

    config = configure

    def cget(self, key):
        if key == 'text':
            return self.text
        return super().cget(key)

    def _draw(self):
        if not self.winfo_exists():
            return
        width, height = self.winfo_width(), self.winfo_height()
        palettes = {'primary': (BLUE, '#1B51BC', 'white', BLUE),
                    'secondary': ('#F8FAFE', '#EAF1FC', '#2459AC', BORDER),
                    'danger': ('#FCEFF0', '#F9E0E3', '#B43143', '#F2D0D7'),
                    'nav': (NAVY, '#1D426C', '#DEE8F5', NAVY)}
        fill, hover, foreground, border = palettes[self.variant]
        if self.selected:
            fill, hover, foreground, border = BLUE, '#1B51BC', 'white', BLUE
        if self.disabled:
            fill, foreground, border = '#EFF2F6', '#8C97A7', '#E3E8EF'
        elif self.hovered or self.pressed:
            fill = hover
        if self.focused and not self.disabled:
            border = '#71A5FF'
        self.delete('all')
        x, y, right, bottom, radius = 1, 1, width-1, height-1, 10
        points = [x+radius,y,right-radius,y,right,y,right,y+radius,right,bottom-radius,
                  right,bottom,right-radius,bottom,x+radius,bottom,x,bottom,x,bottom-radius,x,y+radius,x,y]
        self.create_polygon(points, smooth=True, splinesteps=24, fill=fill, outline=border,
                            width=2 if self.focused else 1)
        text = self.text
        while len(text)>3 and self.text_font.measure(text)>width-20:
            text = text[:-2].rstrip('…')+'…'
        self.create_text(16 if self.variant=='nav' else width/2, height/2, text=text,
                         anchor='w' if self.variant=='nav' else 'center', fill=foreground, font=self.text_font)


class StatusBadge(tk.Label):
    def __init__(self, parent, status='', **kwargs):
        super().__init__(parent, font=('Segoe UI', 9, 'bold'), padx=10, pady=5, **kwargs)
        self.set_status(status)

    def set_status(self, status):
        color = 'green' if status == 'PAID' else 'amber' if status == 'PARTIAL' else 'red'
        bg, fg = COLORS.get(color, COLORS['blue'])
        self.configure(text=status, background=bg, foreground=fg)
