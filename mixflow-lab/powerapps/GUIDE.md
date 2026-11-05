# MIXFLOW Lab в Power Apps: пошаговая инструкция

Цель: за 1–2 вечера собрать **настоящее мобильное приложение** для учёта лабораторных смесей:
- сканировать QR-код партии;
- смотреть её историю;
- отбирать количество, перемещать, списывать;
- получать оповещения о сроке годности.

Это ровно миссии вакансии: **цифровизация учёта запасов в Power Apps** и **прослеживаемость** смесей.

Все данные **вымышленные** (90 партий, 554 движения, 80 мест хранения).

> ⚠️ **Французский интерфейс.** Во французском Power Apps аргументы разделяются `;`, команды `;;`, а десятичный разделитель — `,`. Все формулы ниже уже записаны так. Если интерфейс у тебя на английском, замени `;;` на `;`, а `;` на `,`.

---

## 0. Что понадобится (10 минут)
1. Файлы из этой папки: **`MixflowLab.xlsx`** (база данных) и **`Etiquettes_QR.pdf`** (этикетки).
2. Зайди на **make.powerapps.com** с университетским аккаунтом `…@etu.uca.fr`.
   - Если всё открылось, можно начинать.
   - Если пишет, что нет лицензии или доступа: на странице **Power Apps Developer Plan** нажми « Commencer gratuitement » с тем же аккаунтом. Если университет и это блокирует, напиши мне, найдём другой путь.
3. Установи на телефон приложение **Power Apps** (App Store или Google Play) и войди тем же аккаунтом.
4. Загрузи `MixflowLab.xlsx` в свой **OneDrive** УКА. Файл должен лежать в OneDrive, а не на компьютере.

## 1. Создать приложение (5 минут)
1. На make.powerapps.com: **Créer → Application vide → Application canevas vide**.
2. Название: `MIXFLOW Lab`, формат: **Téléphone** → **Créer**.
3. **Paramètres → Général → Limite de lignes de données** = **2000**. Без этого Power Apps читает только первые 500 строк, а движений у нас 554.
4. Слева **Données → Ajouter des données → Excel Online (Business)** → OneDrive → `MixflowLab.xlsx` → отметь 4 таблицы: `Melanges`, `Emplacements`, `Lots`, `Mouvements` → **Se connecter**.
   При подключении Power Apps сам добавит в таблицы служебный столбец `__PowerAppsId__`. Это нормально, не удаляй его.

## 2. Экран « Accueil » (30 минут)
Переименуй экран в `scrAccueil` (двойной клик по имени слева).

**Заголовок** (Insérer → Étiquette): `Text` = `"MIXFLOW Lab"`

**Тревога** (étiquette `lblAlerte`), `Text`:
```
CountRows(Filter(Lots; Statut = "Disponible" && DateValue(DatePeremption) < Today())) & " lot(s) périmé(s) encore en stock"
```
`Color`: `If(Value(Left(Self.Text; 2)) > 0; Color.Red; Color.Green)`

**Сканер** (Insérer → Média → **Lecteur de codes-barres**), назови `bcScan`. `OnScan`:
```
Set(varLot; LookUp(Lots; NumLot = First(bcScan.Barcodes).Value));;
If(IsBlank(varLot); Notify("Lot inconnu"; NotificationType.Error); Navigate(scrFiche))
```
*Если Power Apps подчёркивает `Barcodes`, значит у тебя старая версия элемента: используй `bcScan.Value` вместо `First(bcScan.Barcodes).Value`.*

**Поиск** (Insérer → Entrée de texte), назови `txtRecherche`, `HintText` = `"Lot, mélange ou emplacement"`.

**Список партий** (Insérer → **Galerie verticale**), назови `galLots`. `Items`:
```
Search(Filter(Lots; Statut <> "Détruit" && Statut <> "Épuisé"); txtRecherche.Text; "NumLot"; "CodeMelange"; "CodeEmplacement")
```
Внутри галереи:
- `Title` → `Text`: `ThisItem.NumLot & " · " & ThisItem.CodeMelange`
- `Subtitle` → `Text`: `ThisItem.CodeEmplacement & " · " & ThisItem.QteRestanteKg & " kg · péremption " & ThisItem.DatePeremption`
- добавь маленький прямоугольник-индикатор, `Fill`:
```
If(DateValue(ThisItem.DatePeremption) < Today(); Color.Red;
   DateValue(ThisItem.DatePeremption) <= DateAdd(Today(); 7; TimeUnit.Days); Color.Orange;
   Color.Green)
```
- `OnSelect` всей галереи: `Set(varLot; ThisItem);; Navigate(scrFiche)`

## 3. Экран « Fiche lot » (30 минут)
Nouvel écran → Vide, назови `scrFiche`.

Подписи (étiquettes):
- `varLot.NumLot` (крупно);
- `"Mélange : " & varLot.CodeMelange & " · " & LookUp(Melanges; CodeMelange = varLot.CodeMelange).Libelle`;
- `"Emplacement : " & varLot.CodeEmplacement & " · Statut : " & varLot.Statut`;
- `"Reste : " & varLot.QteRestanteKg & " kg sur " & varLot.QteInitialeKg & " kg"`;
- `"Péremption : " & varLot.DatePeremption`, `Color`: `If(DateValue(varLot.DatePeremption) < Today(); Color.Red; Color.Black)`.

**История партии** (галерея `galHisto`), `Items`:
```
SortByColumns(Filter(Mouvements; NumLot = varLot.NumLot); "IdMouvement"; SortOrder.Descending)
```
`Title`: `ThisItem.DateMouvement & " · " & ThisItem.TypeMouvement & " · " & ThisItem.QuantiteKg & " kg"`
`Subtitle`: `ThisItem.Utilisateur & " " & ThisItem.Commentaire`

Три кнопки: **Prélever** → `Navigate(scrPrelever)`, **Déplacer** → `Navigate(scrDeplacer)`, **Fin de vie** → `Navigate(scrFinDeVie)`.
Кнопка « Retour »: `Back()`.

## 4. Отбор пробы « Prélever » (20 минут)
Экран `scrPrelever`: поле `txtQte` (`Format` = Nombre), поле `txtCommentaire` и кнопка **Valider**. `OnSelect` кнопки:
```
If(
  IsBlank(txtQte.Text) || Value(txtQte.Text) <= 0 || Value(txtQte.Text) > varLot.QteRestanteKg;
  Notify("Quantité invalide : elle doit être positive et ne pas dépasser " & varLot.QteRestanteKg & " kg"; NotificationType.Error);
  Patch(Lots; LookUp(Lots; NumLot = varLot.NumLot);
    { QteRestanteKg: varLot.QteRestanteKg - Value(txtQte.Text);
      Statut: If(varLot.QteRestanteKg - Value(txtQte.Text) <= 0; "Épuisé"; varLot.Statut) });;
  Patch(Mouvements; Defaults(Mouvements);
    { IdMouvement: "MV-" & Text(Now(); "yyyymmddhhmmss");
      NumLot: varLot.NumLot;
      DateMouvement: Text(Today(); "yyyy-mm-dd");
      TypeMouvement: "Prélèvement";
      QuantiteKg: Value(txtQte.Text);
      De: varLot.CodeEmplacement;
      Utilisateur: User().FullName;
      Commentaire: txtCommentaire.Text });;
  Set(varLot; LookUp(Lots; NumLot = varLot.NumLot));;
  Reset(txtQte);; Reset(txtCommentaire);;
  Notify("Prélèvement enregistré"; NotificationType.Success);;
  Navigate(scrFiche)
)
```
Это **бизнес-правило**: нельзя взять больше, чем есть. Проверка нужна именно для надёжной прослеживаемости, поэтому стоит упомянуть её на собеседовании.

## 5. Перемещение « Déplacer » (15 минут)
Экран `scrDeplacer`, выпадающий список `ddEmpl`. `Items`:
```
Filter(Emplacements; Conservation = LookUp(Melanges; CodeMelange = varLot.CodeMelange).Conservation)
```
`Value` = `CodeEmplacement`. Это второе правило: **смесь, которой нужен холод, не может попасть на стеллаж при комнатной температуре.**

Подпись-подсказка: `"Zone ergonomique : " & ddEmpl.Selected.ZoneErgo & " (Or = niveaux 2-3, à hauteur de taille)"`

Кнопка **Valider**:
```
Patch(Lots; LookUp(Lots; NumLot = varLot.NumLot); { CodeEmplacement: ddEmpl.Selected.CodeEmplacement });;
Patch(Mouvements; Defaults(Mouvements);
  { IdMouvement: "MV-" & Text(Now(); "yyyymmddhhmmss"); NumLot: varLot.NumLot; DateMouvement: Text(Today(); "yyyy-mm-dd");
    TypeMouvement: "Déplacement"; QuantiteKg: varLot.QteRestanteKg; De: varLot.CodeEmplacement; Vers: ddEmpl.Selected.CodeEmplacement;
    Utilisateur: User().FullName });;
Set(varLot; LookUp(Lots; NumLot = varLot.NumLot));;
Notify("Lot déplacé"; NotificationType.Success);; Navigate(scrFiche)
```

## 6. Списание « Fin de vie » (10 минут)
Экран `scrFinDeVie` с текстом `"Confirmer la fin de vie du lot " & varLot.NumLot & " ?"` и двумя кнопками. **Confirmer**:
```
Patch(Mouvements; Defaults(Mouvements);
  { IdMouvement: "MV-" & Text(Now(); "yyyymmddhhmmss"); NumLot: varLot.NumLot; DateMouvement: Text(Today(); "yyyy-mm-dd");
    TypeMouvement: "Fin de vie"; QuantiteKg: varLot.QteRestanteKg; De: varLot.CodeEmplacement; Vers: "Benne déchets";
    Utilisateur: User().FullName; Commentaire: If(DateValue(varLot.DatePeremption) < Today(); "Péremption"; "Fin d'usage") });;
Patch(Lots; LookUp(Lots; NumLot = varLot.NumLot); { Statut: "Détruit"; QteRestanteKg: 0; CodeEmplacement: "" });;
Notify("Fin de vie enregistrée"; NotificationType.Success);; Navigate(scrAccueil)
```
**Annuler**: `Back()`. Подтверждение на отдельном экране защищает от случайного нажатия.

## 7. Протестировать на телефоне (15 минут)
1. **Enregistrer → Publier**.
2. Открой приложение **Power Apps** на телефоне → `MIXFLOW Lab`.
3. Распечатай страницу из `Etiquettes_QR.pdf` (или открой её на экране компьютера) и **отсканируй** этикетку: откроется карточка партии.
4. Сделай отбор 0,5 кг и проверь: в Excel появилась новая строка в `Mouvements`, а остаток уменьшился.

## 8. Бонус: ежедневное оповещение в Power Automate (20 минут)
make.powerautomate.com → **Créer → Flux de cloud planifié**, каждый день в 7:00.
1. **Excel Online (Business) → Lister les lignes présentes dans un tableau** (файл и таблица `Lots`).
2. **Filtrer un tableau**: источник `value`, режим расширенного редактирования:
   `@and(equals(item()?['Statut'], 'Disponible'), lessOrEquals(item()?['DatePeremption'], formatDateTime(addDays(utcNow(), 7), 'yyyy-MM-dd')))`
3. **Créer un tableau HTML** из результата (столбцы NumLot, CodeMelange, CodeEmplacement, DatePeremption).
4. **Office 365 Outlook → Envoyer un e-mail (V2)** себе на почту с этой таблицей.
Даты хранятся как текст `aaaa-mm-jj`, поэтому их можно сравнивать как строки: это сделано специально.

## 9. Как показать работу на собеседовании
Приложение работает только внутри университетского аккаунта, Michelin его открыть не сможет. Поэтому:
- запиши **видео экрана телефона на 60–90 секунд**: скан этикетки → карточка → отбор → история → тревога о сроке годности;
- сделай 3–4 скриншота;
- **возьми с собой распечатанную этикетку** и отсканируй её вживую на собеседовании, если будет уместно.

Что сказать честно: *« Je n’avais jamais utilisé Power Apps. Comme l’offre le mentionne, je l’ai pris en main pour construire ce prototype : modèle de données, règles de gestion, traçabilité des mouvements. »*

## Если что-то не работает
- **Подчёркнуто красным:** почти всегда виноваты разделители `;` и `;;` (см. начало) или опечатка в имени столбца.
- **Видно только 500 строк:** шаг 1.3.
- **Ошибка с датами:** проверь, что используешь `DateValue(...)` для `DatePeremption`.
- **Подчёркнуты имена столбцов в кавычках** в `Search` или `SortByColumns` (например, `"NumLot"`): в новых версиях Power Apps имена столбцов пишутся без кавычек, просто `NumLot`.
- **Сделай скриншот ошибки и пришли мне**, разберёмся.

## Модель данных
| Таблица | Роль | Ключ |
|---|---|---|
| `Melanges` | справочник смесей: срок годности, условия хранения, лаборатория | `CodeMelange` |
| `Emplacements` | места хранения: зона, уровень, эргономическая зона, условия | `CodeEmplacement` |
| `Lots` | партии: даты, количество, место, статус | `NumLot` |
| `Mouvements` | журнал событий: создание, приёмка, размещение, отбор, перемещение, конец жизни | `IdMouvement` |

**Прослеживаемость** = в `Lots` хранится текущее состояние партии, в `Mouvements` — полная история. Любое действие в приложении записывает событие, поэтому историю можно восстановить для каждой партии.
