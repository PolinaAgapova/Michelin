"""
Génère le jeu de données FICTIF du kit Power Apps (aucune donnée de Michelin) :
  - MixflowLab.xlsx : 4 tableaux Excel (Melanges, Emplacements, Lots, Mouvements), prêts pour Power Apps
  - Etiquettes_QR.pdf : étiquettes de lots avec QR code (valeur = numéro de lot)
Usage : python3 generate.py   (graine fixe : mêmes données à chaque exécution)
"""
import random
from datetime import date, timedelta
from openpyxl import Workbook
from openpyxl.styles import Font
from openpyxl.worksheet.table import Table, TableStyleInfo
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF

random.seed(2027)
REF = date(2026, 11, 5)  # date de référence du jeu de données

MELANGES = [
    ("MLG-BR01", "Bande de roulement – essai 01", "Bande de roulement", 60, "Froid +4 °C", "Labo Matériaux"),
    ("MLG-BR02", "Bande de roulement – essai 02", "Bande de roulement", 60, "Froid +4 °C", "Labo Matériaux"),
    ("MLG-FL01", "Flanc – référence", "Flanc", 90, "Ambiant", "Labo Physique"),
    ("MLG-GI01", "Gomme intérieure – essai", "Gomme intérieure", 45, "Froid +4 °C", "Labo Chimie"),
    ("MLG-NC01", "Nappe carcasse – essai", "Nappe", 90, "Ambiant", "Labo Physique"),
    ("MLG-TA01", "Gomme talon – référence", "Talon", 120, "Ambiant", "Labo Matériaux"),
    ("MLG-EX01", "Formulation exploratoire 01", "Exploratoire", 30, "Froid +4 °C", "Labo Chimie"),
    ("MLG-EX02", "Formulation exploratoire 02", "Exploratoire", 30, "Froid +4 °C", "Labo Chimie"),
]
LABOS = ["Labo Matériaux", "Labo Physique", "Labo Chimie", "Labo Essais"]
USERS = ["Technicien magasin", "Technicien labo Matériaux", "Technicien labo Physique", "Technicien labo Chimie"]

# Emplacements : 2 armoires froides (A, B) et 2 racks ambiants (C, D), niveaux 1 à 5, 4 positions
EMPL = []
for zone, cons in [("A", "Froid +4 °C"), ("B", "Froid +4 °C"), ("C", "Ambiant"), ("D", "Ambiant")]:
    for niv in range(1, 6):
        for pos in range(1, 5):
            ergo = "Or" if niv in (2, 3) else ("Argent" if niv == 1 else "Bronze")
            nom = ("Armoire froide " if cons.startswith("Froid") else "Rack ambiant ") + zone
            EMPL.append((f"{zone}-N{niv}-P{pos}", nom, niv, ergo, cons, 4))

lots, mvts = [], []
mid = 1
def mv(lot, d, typ, q, de, vers, user, com=""):
    global mid
    mvts.append((f"MV-{mid:05d}", lot, d, typ, q, de, vers, user, com)); mid += 1

for i in range(1, 91):
    m = random.choice(MELANGES)
    fab = REF - timedelta(days=random.randint(1, 110))
    per = fab + timedelta(days=m[3])
    q0 = random.choice([2, 3, 5, 5, 8, 10, 12, 15, 20])
    num = f"LOT-26-{i:04d}"
    labo = m[5] if random.random() < .7 else random.choice(LABOS)
    places = [e for e in EMPL if e[4] == m[4]]
    # les lots fréquemment utilisés ne sont pas forcément bien placés : c'est le point de départ de l'optimisation
    emp = random.choice(places)[0]
    mv(num, fab, "Création", q0, "", "Atelier mélange", "Technicien magasin", f"Demande {labo}")
    mv(num, fab + timedelta(days=1), "Réception", q0, "Atelier mélange", "Quai magasin", "Technicien magasin")
    mv(num, fab + timedelta(days=1), "Rangement", q0, "Quai magasin", emp, "Technicien magasin")
    rest = q0
    n_prel = random.choice([0, 1, 2, 3, 4, 6, 8, 10])
    d = fab + timedelta(days=2)
    for _ in range(n_prel):
        d += timedelta(days=random.randint(1, 12))
        if d >= REF or rest <= .2: break
        q = round(min(rest, random.choice([.2, .3, .5, .5, 1, 1.5, 2])), 1)
        rest = round(rest - q, 1)
        mv(num, d, "Prélèvement", q, emp, "", random.choice(USERS[1:]), random.choice(["Essai rhéologie", "Éprouvettes traction", "Essai vieillissement", "Mesure dureté", ""]))
    statut = "Disponible"
    if per < REF and random.random() < .45:
        mv(num, per + timedelta(days=random.randint(1, 10)), "Fin de vie", rest, emp, "Benne déchets", "Technicien magasin", "Péremption")
        statut, rest, emp = "Détruit", 0, ""
    elif rest <= 0:
        statut, emp = "Épuisé", ""
    elif (REF - fab).days < 2:
        statut = "En maturation"
    elif random.random() < .05:
        statut = "Bloqué"
    lots.append((num, m[0], fab, per, q0, rest, emp, statut, labo))

mvts.sort(key=lambda x: (x[2], x[0]))
# identifiants renumérotés dans l'ordre chronologique : trier par IdMouvement = trier par date
mvts = [(f"MV-{i:05d}", *m[1:]) for i, m in enumerate(mvts, 1)]

wb = Workbook()
def sheet(ws, name, headers, rows, date_cols=()):
    ws.title = name
    ws.append(headers)
    for r in rows: ws.append(list(r))
    for c in date_cols:
        for row in ws.iter_rows(min_row=2, min_col=c, max_col=c):
            for cell in row: cell.number_format = "yyyy-mm-dd"
    ref = f"A1:{chr(64 + len(headers))}{len(rows) + 1}"
    t = Table(displayName=name, ref=ref)
    t.tableStyleInfo = TableStyleInfo(name="TableStyleMedium2", showRowStripes=True)
    ws.add_table(t)
    for i, h in enumerate(headers, 1): ws.column_dimensions[chr(64 + i)].width = max(14, len(h) + 4)
    ws["A1"].font = Font(bold=True)

sheet(wb.active, "Melanges", ["CodeMelange", "Libelle", "Famille", "DureeVieJours", "Conservation", "LaboReferent"], MELANGES)
sheet(wb.create_sheet(), "Emplacements", ["CodeEmplacement", "Zone", "Niveau", "ZoneErgo", "Conservation", "CapaciteBacs"], EMPL)
# Dates écrites en texte ISO (aaaa-mm-jj) : Power Apps les lit toujours de la même façon, via DateValue().
iso = lambda d: d.isoformat()
sheet(wb.create_sheet(), "Lots", ["NumLot", "CodeMelange", "DateFabrication", "DatePeremption", "QteInitialeKg", "QteRestanteKg", "CodeEmplacement", "Statut", "LaboDemandeur"],
      [(l[0], l[1], iso(l[2]), iso(l[3]), *l[4:]) for l in lots])
sheet(wb.create_sheet(), "Mouvements", ["IdMouvement", "NumLot", "DateMouvement", "TypeMouvement", "QuantiteKg", "De", "Vers", "Utilisateur", "Commentaire"],
      [(m[0], m[1], iso(m[2]), *m[3:]) for m in mvts])
wb.save("MixflowLab.xlsx")

# Étiquettes QR (lots encore en stock), 3 × 7 par page A4
c = canvas.Canvas("Etiquettes_QR.pdf", pagesize=A4)
W, H = A4
cols, rows_ = 3, 7
lw, lh = (W - 20 * mm) / cols, (H - 24 * mm) / rows_
melib = {m[0]: m[1] for m in MELANGES}
stock = [l for l in lots if l[7] not in ("Détruit", "Épuisé")]
for k, l in enumerate(stock):
    if k and k % (cols * rows_) == 0: c.showPage()
    i = k % (cols * rows_)
    x = 10 * mm + (i % cols) * lw
    y = H - 12 * mm - (i // cols + 1) * lh
    c.setStrokeColorRGB(.8, .8, .8); c.rect(x + 1 * mm, y + 1 * mm, lw - 2 * mm, lh - 2 * mm)
    qr = QrCodeWidget(l[0]); b = qr.getBounds(); s = 26 * mm
    d = Drawing(s, s, transform=[s / (b[2] - b[0]), 0, 0, s / (b[3] - b[1]), 0, 0]); d.add(qr)
    renderPDF.draw(d, c, x + 3 * mm, y + (lh - s) / 2)
    tx = x + 31 * mm
    c.setFont("Helvetica-Bold", 10); c.drawString(tx, y + lh - 10 * mm, l[0])
    c.setFont("Helvetica", 7.5); c.drawString(tx, y + lh - 15 * mm, l[1])
    lib = melib[l[1]]; c.drawString(tx, y + lh - 19 * mm, lib if len(lib) <= 24 else lib[:23] + "…")
    c.drawString(tx, y + lh - 23 * mm, f"Fab. {l[2]:%d/%m/%Y}")
    c.setFont("Helvetica-Bold", 7.5); c.drawString(tx, y + lh - 27 * mm, f"Péremption {l[3]:%d/%m/%Y}")
    c.setFont("Helvetica", 6); c.setFillColorRGB(.4, .4, .4); c.drawString(tx, y + 4 * mm, "Fictif · projet personnel"); c.setFillColorRGB(0, 0, 0)
c.save()
print(f"{len(lots)} lots, {len(mvts)} mouvements, {len(EMPL)} emplacements, {len(stock)} étiquettes")
