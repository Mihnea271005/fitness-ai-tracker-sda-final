# Fitness AI Tracker - SDA Academy Final Project

Aplicatie Python cu Streamlit si machine learning pentru urmarirea antrenamentelor si recomandari AI pentru urmatoarea sesiune.

Versiunea aceasta foloseste ca seed/training source dataset-ul Kaggle `joep89/weightlifting`, in locul generatorului sintetic folosit anterior.

## Ce s-a schimbat in aceasta versiune

- seed data sintetica a fost inlocuita cu import din dataset-ul real Kaggle
- exercitiile din aplicatie au fost extinse pe baza dataset-ului
- numele de exercitii sunt normalizate pentru a evita duplicate evidente
- greutatile din Kaggle sunt convertite din pounds in kg
- randurile cardio sau cu `reps = 0` raman in istoric, dar sunt ignorate de componenta AI

## Functionalitati

- adaugare manuala de serii cu data, exercitiu, repetari, greutate si observatii
- stocare locala in SQLite
- istoric complet cu export CSV
- grafice de progres si recorduri personale
- antrenare model AI direct din interfata
- recomandare greutate + repetari pentru sesiunea urmatoare
- alerta de stagnare / declin
- comparatie intre modele
- explicatii prin feature importance

## Dataset

Sursa de seed/training data:
- Kaggle: `joep89/weightlifting`

CSV folosit in proiect:
- `data/weightlifting_721_workouts.csv`

La incarcare, aplicatia mapeaza datele astfel:
- `Date` -> `workout_date`
- `Exercise Name` -> `exercise`
- `Set Order` -> `set_number`
- `Reps` -> `reps`
- `Weight` -> `weight` (convertit din lb in kg)
- `Notes` + `Workout Notes` -> `notes`

## Componenta AI

Model principal:
- `RandomForestRegressor(n_estimators=150)`

Feature-uri:
- `exercise`
- `prev_max_weight`
- `prev_avg_reps`
- `prev_total_volume`
- `prev_total_sets`
- `prev_days_since_last`
- `prev_session_count`
- `prev_weight_trend_3`

Output:
- greutate recomandata
- repetari recomandate

Evaluare:
- MAE pe split cronologic 80/20

## Structura proiectului

```text
fitness-ai-tracker-sda-final/
|-- app.py
|-- requirements.txt
|-- README.md
|-- data/
|   |-- weightlifting_721_workouts.csv
|   `-- seed_workouts.csv
|-- models/
|   `-- next_workout_model.joblib
`-- src/
    |-- __init__.py
    |-- analytics.py
    |-- constants.py
    |-- database.py
    |-- features.py
    |-- model.py
    `-- seed.py
```

## Instalare

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Rulare

```bash
streamlit run app.py
```

Aplicatia se deschide de obicei la:
- [http://localhost:8501](http://localhost:8501)

## Flux demo recomandat

1. Click pe `Incarca date Kaggle`
2. Click pe `Antreneaza modelul AI`
3. Intra in tab-ul `AI Coach`
4. Selecteaza un exercitiu
5. Arata recomandarea, progresul si comparatia intre modele

## Limitari

- un singur utilizator
- unele exercitii cardio din dataset nu sunt utile pentru recomandare
- modelul depinde de consistenta datelor istorice

## Idei de extensie

- upload de date exportate din alte aplicatii
- autentificare multi-user
- export PDF
- deploy permanent in cloud
