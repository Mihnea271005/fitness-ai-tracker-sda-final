# Fitness AI Tracker — SDA Academy Final Project

Aplicație finală Python cu machine learning pentru cursul de inteligență artificială.  
Urmărește antrenamentele și folosește AI pentru a recomanda greutatea și repetările la sesiunea următoare.

## Ce s-a îmbunătățit față de versiunea inițială

| Zonă | Versiunea veche | Versiunea nouă |
|---|---|---|
| Feature-uri model | 5 | 7 (+ trend 3 sesiuni + session count) |
| Modele disponibile | RandomForest | RF + GradientBoosting + Ridge |
| Comparație modele | ❌ | ✅ cu grafic MAE |
| Feature importance | ❌ | ✅ grafic interactiv |
| Detecție stagnare | ❌ | ✅ alertă automată |
| Detecție oboseală | ❌ | ✅ alertă declin |
| Recorduri personale | ❌ | ✅ tab dedicat |
| Analiza progres | ❌ | ✅ status per exercițiu |
| Volum săptămânal | ❌ | ✅ grafic bar |
| Distribuție grupe | ❌ | ✅ pie chart |
| Seed data | CSV static (~30 rânduri) | Generator programatic (1 008 rânduri, 14 săptămâni) |
| Dashboard | 3 metrici | 5 metrici (+ streak + volum total) |

## Funcționalități

- Adăugare manuală de serii cu dată, exercițiu, repetări, greutate și observații
- Stocare locală în SQLite
- Istoric complet cu export CSV
- Grafice de progres: greutate maximă, volum săptămânal, distribuție grupe musculare
- Seed data realistă: 14 săptămâni, 8 exerciții, progresie liniară cu deload periodic
- Antrenare model AI direct din interfață
- Recomandare greutate + repetări pentru sesiunea următoare
- Alertă automată de stagnare și oboseală
- Feature importance — *de ce* recomandă modelul ce recomandă
- Comparație RandomForest vs GradientBoosting vs Ridge
- Recorduri personale (PR) per exercițiu
- Analiza trend progres per exercițiu

## Componenta AI

**Model principal:** `RandomForestRegressor(n_estimators=150)`

**Feature-uri (input):**

| Feature | Descriere |
|---|---|
| `exercise` | Exercițiul (one-hot encoded) |
| `prev_max_weight` | Greutatea maximă din sesiunea anterioară |
| `prev_avg_reps` | Repetările medii anterioare |
| `prev_total_volume` | Volum total anterior (reps × kg) |
| `prev_total_sets` | Numărul de serii |
| `prev_days_since_last` | Zilele de pauză |
| `prev_session_count` | A câta sesiune totală |
| `prev_weight_trend_3` | Tendința greutății pe ultimele 3 sesiuni |

**Output:** greutate recomandată + repetări recomandate

**Evaluare:** MAE pe split 80/20 cronologic (nu aleator, pentru realism)

## Structura proiectului

```
fitness-ai-tracker-sda-final/
├── app.py                  # Aplicația Streamlit
├── requirements.txt
├── README.md
├── data/
│   └── seed_workouts.csv   # Generat automat la seed load
├── models/
│   └── next_workout_model.joblib
└── src/
    ├── __init__.py
    ├── analytics.py        # Stagnare, PR-uri, streak, volum (NOU)
    ├── constants.py        # Exerciții, grupe musculare, categorii
    ├── database.py         # SQLite CRUD
    ├── features.py         # Feature engineering
    ├── model.py            # Train, predict, compare, feature importance
    └── seed.py             # Generator programatic date realiste
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

Aplicația se deschide la: [http://localhost:8501](http://localhost:8501)

## Flux demo recomandat (examen)

1. Click **"Încarcă seed data"** — generează 14 săptămâni de antrenamente
2. Click **"Antrenează modelul AI"**
3. Tab **AI Coach** → selectezi exercițiu → arăți recomandarea + alertă stagnare
4. Expander **Feature Importance** → explici ce feature contează
5. Expander **Comparație modele** → demonstrezi că RF e mai bun decât Ridge
6. Tab **Recorduri** → arăți PRs și analiza de trend per exercițiu
7. Tab **Pregătire Examen** → structura prezentării și răspunsuri la întrebări

## Evaluare model

- `MAE greutate` — eroarea medie în kg pe setul de test
- `MAE repetări` — eroarea medie în repetări pe setul de test
- Split cronologic 80/20 (nu random) pentru a reflecta realitatea unui model time-series

## Limitări cunoscute

- Un singur utilizator
- Necesită date consistente pentru recomandări bune
- Nu înlocuiește sfatul unui antrenor uman

## Idei de extensie

- Autentificare multi-user
- Export PDF cu raport de progres
- Deploy pe Streamlit Cloud
- Notificări email la stagnare
- Predicție bazată pe plan de antrenament predefinit
