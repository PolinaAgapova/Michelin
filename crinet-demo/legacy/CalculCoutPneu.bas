Attribute VB_Name = "CalculCoutPneu"
' =====================================================================
'  OUTIL LEGACY FICTIF - écrit pour l'exercice de migration.
'  Imite une macro Excel "historique" de calcul de coût pneu.
'  Ne provient d'aucune entreprise.
' =====================================================================
'  Feuilles attendues :
'    "Matieres"  : A=Code  B=Libelle  C=Famille  D=Prix EUR/kg
'    "Nomencl"   : A=CodePneu  B=CodeMatiere  C=Kg
'    "Gamme"     : A=CodePneu  B=Etape  C=TpsCycleMin  D=TauxMachine  E=TauxMO  F=NbOp  G=kWh
'    "Pneus"     : A=CodePneu  B=Libelle  C=TauxRebut
'    "Resultat"  : sortie
' ---------------------------------------------------------------------
'  Historique :
'    2009-03  JM   creation
'    2012-11  JM   ajout energie
'    2016-06  SB   frais de structure (demande controle de gestion)
'    2019-01  ??   correctif "matiere introuvable qui plante"
' =====================================================================
Option Explicit

Const PRIX_KWH As Double = 0.18        ' TODO mettre dans une feuille de parametres
Const TX_FRAIS As Double = 0.35

Public Function PrixMatiere(code As String) As Double
    Dim c As Range
    On Error Resume Next                ' 2019-01 : evite le plantage
    Set c = Sheets("Matieres").Columns(1).Find(What:=code, LookAt:=xlWhole)
    PrixMatiere = c.Offset(0, 3).Value
End Function

Public Function CoutPneu(codePneu As String) As Double
    Dim i As Long, derLigne As Long
    Dim mat As Double, mo As Double, mach As Double, ener As Double
    Dim direct As Double, rebut As Double, frais As Double
    Dim h As Double, txRebut As Double

    ' --- matieres ---
    With Sheets("Nomencl")
        derLigne = .Cells(.Rows.Count, 1).End(xlUp).Row
        For i = 2 To derLigne
            If .Cells(i, 1).Value = codePneu Then
                mat = mat + Round(.Cells(i, 3).Value * PrixMatiere(.Cells(i, 2).Value), 2)
            End If
        Next i
    End With

    ' --- gamme ---
    With Sheets("Gamme")
        derLigne = .Cells(.Rows.Count, 1).End(xlUp).Row
        For i = 2 To derLigne
            If .Cells(i, 1).Value = codePneu Then
                h = .Cells(i, 3).Value / 60
                mo = mo + Round(h * .Cells(i, 5).Value * .Cells(i, 6).Value, 2)
                mach = mach + Round(h * .Cells(i, 4).Value, 2)
                ener = ener + Round(.Cells(i, 7).Value * PRIX_KWH, 2)
            End If
        Next i
    End With

    txRebut = Application.WorksheetFunction.VLookup(codePneu, Sheets("Pneus").Range("A:C"), 3, False)

    direct = mat + mo + mach + ener
    rebut = Round(direct * txRebut, 2)
    frais = Round(mo * TX_FRAIS, 2)     ' 2016-06 SB

    CoutPneu = Round(direct + rebut + frais, 2)
End Function

Public Sub CalculerTout()
    Dim i As Long, derLigne As Long
    With Sheets("Pneus")
        derLigne = .Cells(.Rows.Count, 1).End(xlUp).Row
        For i = 2 To derLigne
            Sheets("Resultat").Cells(i, 1).Value = .Cells(i, 1).Value
            Sheets("Resultat").Cells(i, 2).Value = CoutPneu(.Cells(i, 1).Value)
        Next i
    End With
    MsgBox "Calcul termine"
End Sub
