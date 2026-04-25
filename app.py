from __future__ import annotations

import pandas as pd
import plotly.express as px
import streamlit as st

from src.analytics import (
    compute_workout_streak,
    detect_stagnation,
    get_personal_records,
    get_total_volume_per_muscle,
    get_weekly_volume,
)
from src.constants import EXERCISE_OPTIONS, MUSCLE_GROUPS
from src.database import clear_sets, init_db, insert_set, load_sets
from src.model import (
    compare_models,
    evaluate_model,
    get_feature_importances,
    predict_next_workout,
    train_model,
)
from src.seed import load_seed_data


# ─── Page config ─────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Fitness AI Tracker",
    layout="wide",
    page_icon="💪",
)
init_db()

# ─── Session state ────────────────────────────────────────────────────────────
for _key, _default in [
    ("training_message", ""),
    ("training_metrics", None),
    ("comparison_results", None),
]:
    if _key not in st.session_state:
        st.session_state[_key] = _default


def _to_csv_bytes(df: pd.DataFrame) -> bytes:
    return df.to_csv(index=False).encode("utf-8")


# ─── Header ───────────────────────────────────────────────────────────────────
st.title("💪 Fitness AI Tracker")
st.caption(
    "Aplicație Python cu machine learning pentru urmărirea antrenamentelor "
    "și recomandări AI personalizate."
)

# ─── Dashboard metrics ────────────────────────────────────────────────────────
sets_df = load_sets()

_total_sets = len(sets_df)
_total_sessions = (
    sets_df[["workout_date", "exercise"]].drop_duplicates().shape[0]
    if not sets_df.empty
    else 0
)
_total_exercises = sets_df["exercise"].nunique() if not sets_df.empty else 0
_streak = compute_workout_streak(sets_df) if not sets_df.empty else 0
_total_volume_t = (
    round((sets_df["reps"] * sets_df["weight"]).sum() / 1000, 1)
    if not sets_df.empty
    else 0.0
)

c1, c2, c3, c4, c5 = st.columns(5)
c1.metric("📦 Serii salvate", _total_sets)
c2.metric("🗓️ Sesiuni totale", _total_sessions)
c3.metric("🏋️ Exerciții", _total_exercises)
c4.metric("🔥 Streak curent", f"{_streak} zile")
c5.metric("⚡ Volum total", f"{_total_volume_t} t")

# ─── Sidebar ──────────────────────────────────────────────────────────────────
with st.sidebar:
    st.header("⚙️ Control proiect")

    if st.button("📂 Încarcă seed data", use_container_width=True):
        with st.spinner("Generare date..."):
            load_seed_data()
        st.success("14 săptămâni de antrenamente generate!")
        st.rerun()

    if st.button("🗑️ Resetează baza de date", use_container_width=True):
        clear_sets()
        st.warning("Toate datele au fost șterse.")
        st.rerun()

    if st.button("🧠 Antrenează modelul AI", use_container_width=True):
        with st.spinner("Antrenare în curs..."):
            _, msg, metrics = train_model(load_sets())
        st.session_state.training_message = msg
        st.session_state.training_metrics = metrics
        if metrics is None:
            st.warning(msg)
        else:
            st.success(msg)

    st.divider()
    st.markdown(
        """
        **Ce face AI-ul?**
        - extrage 7 feature-uri din istoricul tău
        - antrenează un `RandomForestRegressor`
        - recomandă greutatea și repetările următoare
        - detectează stagnare și oboseală
        - compară cu GradientBoosting și Ridge
        """
    )

    if st.session_state.training_metrics:
        m = st.session_state.training_metrics
        st.divider()
        st.markdown("**Ultima antrenare:**")
        st.markdown(
            f"- MAE greutate: **{m['weight_mae']} kg**  \n"
            f"- MAE repetări: **{m['reps_mae']}**  \n"
            f"- Exemple: **{int(m['samples'])}**"
        )

# ─── Tabs ─────────────────────────────────────────────────────────────────────
tab_log, tab_history, tab_ai, tab_records, tab_exam = st.tabs(
    [
        "➕ Adaugă workout",
        "📈 Istoric & Progres",
        "🤖 AI Coach",
        "🏆 Recorduri",
        "📝 Pregătire Examen",
    ]
)

# ══════════════════════════════════════════════════════════════════════════════
# TAB 1 — Adaugă workout
# ══════════════════════════════════════════════════════════════════════════════
with tab_log:
    st.subheader("Adaugă o serie nouă")

    with st.form("add_set_form"):
        col_date, col_ex = st.columns(2)
        workout_date = col_date.date_input("Data")
        exercise = col_ex.selectbox("Exercițiu", EXERCISE_OPTIONS)

        col_set, col_reps, col_weight = st.columns(3)
        set_number = col_set.number_input("Seria #", min_value=1, value=1, step=1)
        reps = col_reps.number_input("Repetări", min_value=1, value=8, step=1)
        weight = col_weight.number_input("Greutate (kg)", min_value=0.0, value=40.0, step=2.5)

        notes = st.text_input("Observații (opțional)")
        submitted = st.form_submit_button("💾 Salvează seria", use_container_width=True)

    if submitted:
        insert_set(
            str(workout_date),
            exercise,
            int(set_number),
            int(reps),
            float(weight),
            notes,
        )
        st.success(
            f"✅ Seria {set_number} la **{exercise}** — {weight} kg × {reps} rep salvată!"
        )
        st.rerun()

# ══════════════════════════════════════════════════════════════════════════════
# TAB 2 — Istoric & Progres
# ══════════════════════════════════════════════════════════════════════════════
with tab_history:
    st.subheader("Istoric antrenamente")
    sets_df = load_sets()

    if sets_df.empty:
        st.info("Nu există date încă. Încarcă seed data sau adaugă manual câteva serii.")
    else:
        col_filter, col_dl = st.columns([4, 1])
        selected_ex = col_filter.selectbox(
            "Filtrează exercițiu",
            ["Toate"] + sorted(sets_df["exercise"].unique().tolist()),
            key="history_filter",
        )

        filtered_df = (
            sets_df if selected_ex == "Toate"
            else sets_df[sets_df["exercise"] == selected_ex]
        )

        st.dataframe(filtered_df, use_container_width=True, hide_index=True)
        col_dl.download_button(
            "📥 CSV",
            data=_to_csv_bytes(filtered_df),
            file_name="fitness_history.csv",
            mime="text/csv",
            use_container_width=True,
        )

        # Compute volume before groupby
        filtered_copy = filtered_df.copy()
        filtered_copy["volume"] = filtered_copy["reps"] * filtered_copy["weight"]
        progress_df = (
            filtered_copy.groupby(["workout_date", "exercise"], as_index=False)
            .agg(
                max_weight=("weight", "max"),
                avg_reps=("reps", "mean"),
                total_volume=("volume", "sum"),
            )
            .sort_values("workout_date")
        )

        # Weight progression chart
        fig_weight = px.line(
            progress_df,
            x="workout_date",
            y="max_weight",
            color="exercise",
            markers=True,
            title="Evoluția greutății maxime",
            labels={"workout_date": "Data", "max_weight": "Greutate max (kg)", "exercise": "Exercițiu"},
        )
        st.plotly_chart(fig_weight, use_container_width=True)

        # Secondary charts
        if selected_ex != "Toate":
            weekly_vol = get_weekly_volume(sets_df, selected_ex)
            if not weekly_vol.empty:
                fig_vol = px.bar(
                    weekly_vol,
                    x="week",
                    y="total_volume",
                    title=f"Volum săptămânal — {selected_ex}",
                    labels={"week": "Săptămâna", "total_volume": "Volum total (kg)"},
                    color_discrete_sequence=["#1f77b4"],
                )
                st.plotly_chart(fig_vol, use_container_width=True)
        else:
            muscle_vol = get_total_volume_per_muscle(sets_df, MUSCLE_GROUPS)
            if not muscle_vol.empty:
                fig_pie = px.pie(
                    muscle_vol,
                    names="muscle_group",
                    values="total_volume",
                    title="Distribuția volumului pe grupe musculare",
                )
                st.plotly_chart(fig_pie, use_container_width=True)

# ══════════════════════════════════════════════════════════════════════════════
# TAB 3 — AI Coach
# ══════════════════════════════════════════════════════════════════════════════
with tab_ai:
    st.subheader("🤖 Recomandare AI pentru următoarea sesiune")
    sets_df = load_sets()

    if sets_df.empty:
        st.info("Adaugă date sau încarcă seed data, apoi antrenează modelul din sidebar.")
    else:
        exercises_available = sorted(sets_df["exercise"].unique().tolist())
        selected_ai_ex = st.selectbox("Alege exercițiul", exercises_available, key="ai_exercise")

        # ── Stagnation / fatigue alert ─────────────────────────────────────
        stag = detect_stagnation(sets_df, selected_ai_ex)
        if stag["is_declining"]:
            st.warning(
                f"⚠️ **Oboseală detectată** la *{selected_ai_ex}*: greutatea a scăzut în "
                "ultima sesiune. Ia în considerare o zi de recuperare sau o sesiune ușoară."
            )
        elif stag["is_stagnating"] and stag["sessions_checked"] >= 3:
            st.info(
                f"📊 **Stagnare detectată** la *{selected_ai_ex}* în ultimele "
                f"{stag['sessions_checked']} sesiuni (trend: {stag['trend']:+.1f} kg/sesiune). "
                "Încearcă să crești greutatea cu 2,5 kg la următoarea sesiune."
            )
        elif stag["trend"] and stag["trend"] > 0:
            st.success(
                f"✅ Progres constant la *{selected_ai_ex}*: "
                f"+{stag['trend']:.1f} kg/sesiune în medie."
            )

        # ── Prediction ────────────────────────────────────────────────────
        suggestion = predict_next_workout(sets_df, selected_ai_ex)
        quick_metrics = evaluate_model(sets_df)

        col_w, col_r, col_mae = st.columns(3)
        if suggestion is not None:
            col_w.metric("🏋️ Greutate recomandată", f"{suggestion['suggested_weight']} kg")
            col_r.metric("🔄 Repetări recomandate", f"{suggestion['suggested_reps']:.0f}")
        if quick_metrics is not None:
            col_mae.metric("📐 MAE greutate (test)", f"{quick_metrics['weight_mae']} kg")

        if suggestion is None:
            st.warning(
                "⚠️ Modelul nu este disponibil. "
                "Apasă **Antrenează modelul AI** din sidebar."
            )
        else:
            # Progression chart with prediction point
            ex_hist = sets_df[sets_df["exercise"] == selected_ai_ex].copy()
            ex_hist["workout_date"] = pd.to_datetime(ex_hist["workout_date"])
            chart_df = (
                ex_hist.groupby("workout_date", as_index=False)
                .agg(max_weight=("weight", "max"), avg_reps=("reps", "mean"))
                .sort_values("workout_date")
            )
            chart_df["tip"] = "Istoric"

            next_date = chart_df["workout_date"].max() + pd.Timedelta(days=3)
            pred_row = pd.DataFrame(
                [
                    {
                        "workout_date": next_date,
                        "max_weight": suggestion["suggested_weight"],
                        "avg_reps": suggestion["suggested_reps"],
                        "tip": "Predicție AI",
                    }
                ]
            )
            combined = pd.concat([chart_df, pred_row], ignore_index=True)

            fig_prog = px.line(
                combined,
                x="workout_date",
                y="max_weight",
                color="tip",
                markers=True,
                title=f"Progresie + Predicție AI — {selected_ai_ex}",
                labels={
                    "workout_date": "Data",
                    "max_weight": "Greutate max (kg)",
                    "tip": "",
                },
                color_discrete_map={"Istoric": "#1f77b4", "Predicție AI": "#ff7f0e"},
            )
            st.plotly_chart(fig_prog, use_container_width=True)

            # ── Feature importance ─────────────────────────────────────────
            with st.expander("🔍 De ce această recomandare? (Feature Importance)"):
                importances = get_feature_importances(sets_df)
                if importances is not None:
                    top = importances.head(8)
                    # Clean up OHE feature names for display
                    clean_names = [
                        n.replace("exercise_", "ex: ") if n.startswith("exercise_") else n
                        for n in top.index
                    ]
                    fig_imp = px.bar(
                        x=top.values,
                        y=clean_names,
                        orientation="h",
                        title="Importanța feature-urilor în RandomForest",
                        labels={"x": "Importanță relativă", "y": ""},
                        color=top.values,
                        color_continuous_scale="Blues",
                    )
                    fig_imp.update_layout(showlegend=False, coloraxis_showscale=False)
                    fig_imp.update_yaxes(autorange="reversed")
                    st.plotly_chart(fig_imp, use_container_width=True)
                    st.caption(
                        "Modelul acordă cea mai mare importanță greutății maxime anterioare "
                        "și volumului total — exact ce un antrenor experimentat ar urmări."
                    )
                else:
                    st.info("Antrenează modelul pentru a vedea importanța feature-urilor.")

            # ── Model comparison ───────────────────────────────────────────
            with st.expander("📊 Comparație modele AI"):
                if st.button("▶️ Rulează comparație (RF vs GB vs Ridge)"):
                    with st.spinner("Antrenare și evaluare 3 modele..."):
                        st.session_state.comparison_results = compare_models(sets_df)

                if st.session_state.comparison_results:
                    comp = st.session_state.comparison_results
                    comp_df = pd.DataFrame(comp).T.reset_index()
                    comp_df.columns = ["Model", "MAE Greutate (kg)", "MAE Repetări"]
                    st.dataframe(comp_df, use_container_width=True, hide_index=True)

                    best = min(comp, key=lambda k: comp[k]["weight_mae"])
                    st.success(
                        f"✅ Cel mai precis pe greutate: **{best}** "
                        f"(MAE = {comp[best]['weight_mae']} kg)"
                    )

                    fig_comp = px.bar(
                        comp_df,
                        x="Model",
                        y="MAE Greutate (kg)",
                        color="Model",
                        title="Eroarea medie pe greutate — comparație modele",
                        color_discrete_sequence=px.colors.qualitative.Set2,
                    )
                    fig_comp.update_layout(showlegend=False)
                    st.plotly_chart(fig_comp, use_container_width=True)
                    st.caption(
                        "Aplicația folosește **Random Forest** ca model principal — "
                        "gestionează bine datele tabulare mici, nu necesită normalizare "
                        "și oferă feature importance nativ."
                    )
                elif st.session_state.comparison_results is not None:
                    st.warning("Nu sunt suficiente date pentru comparație.")

        # ── How it works ──────────────────────────────────────────────────
        with st.expander("ℹ️ Cum funcționează AI-ul?"):
            st.markdown(
                """
                **Pipeline complet:**

                1. **Date brute** — serii cu dată, exercițiu, repetări, greutate  
                2. **Feature engineering** — agregate per sesiune:
                   - `prev_max_weight` — greutatea maximă anterioară  
                   - `prev_avg_reps` — repetările medii anterioare  
                   - `prev_total_volume` — volum total (reps × kg)  
                   - `prev_total_sets` — numărul de serii  
                   - `prev_days_since_last` — zilele de pauză  
                   - `prev_session_count` — a câta sesiune e aceasta  
                   - `prev_weight_trend_3` — trendul de greutate din ultimele 3 sesiuni  
                3. **Model** — `RandomForestRegressor(n_estimators=150)`  
                4. **Evaluare** — split 80/20 cronologic (nu aleator)  
                5. **Predicție** — greutate și repetări sugerate pentru sesiunea următoare  
                6. **Detecție** — alertă automată de stagnare sau oboseală  
                """
            )

# ══════════════════════════════════════════════════════════════════════════════
# TAB 4 — Recorduri Personale
# ══════════════════════════════════════════════════════════════════════════════
with tab_records:
    st.subheader("🏆 Recorduri Personale (PR)")
    sets_df = load_sets()

    if sets_df.empty:
        st.info("Nu există date. Încarcă seed data pentru demo.")
    else:
        prs = get_personal_records(sets_df)
        if not prs.empty:
            prs["Grupă musculară"] = prs["exercise"].map(MUSCLE_GROUPS).fillna("—")

            col_tbl, col_chart = st.columns([1, 1])

            with col_tbl:
                st.markdown("**Recorduri pe exercițiu:**")
                st.dataframe(
                    prs.rename(
                        columns={
                            "exercise": "Exercițiu",
                            "max_weight": "PR (kg)",
                            "achieved_on": "Atins la",
                        }
                    )[["Exercițiu", "PR (kg)", "Atins la", "Grupă musculară"]],
                    use_container_width=True,
                    hide_index=True,
                )

            with col_chart:
                fig_pr = px.bar(
                    prs.sort_values("max_weight"),
                    x="max_weight",
                    y="exercise",
                    orientation="h",
                    color="exercise",
                    title="Recorduri personale — toate exercițiile",
                    labels={"max_weight": "Greutate max (kg)", "exercise": ""},
                )
                fig_pr.update_layout(showlegend=False)
                st.plotly_chart(fig_pr, use_container_width=True)

        # ── Progress analysis per exercise ────────────────────────────────
        st.markdown("---")
        st.markdown("**Analiza progresului per exercițiu:**")

        rows = []
        for ex in sorted(sets_df["exercise"].unique()):
            s = detect_stagnation(sets_df, ex)
            if s["sessions_checked"] < 2:
                continue
            if s["is_declining"]:
                status = "🔴 Declin"
            elif s["is_stagnating"]:
                status = "⚠️ Stagnare"
            elif s["trend"] > 0:
                status = "✅ Progres"
            else:
                status = "➡️ Menținere"
            rows.append(
                {
                    "Exercițiu": ex,
                    "Trend (kg/sesiune)": f"{s['trend']:+.2f}",
                    "Ultima greutate": f"{s['last_weight']} kg" if s["last_weight"] else "—",
                    "Sesiuni analizate": s["sessions_checked"],
                    "Status": status,
                }
            )

        if rows:
            st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)

# ══════════════════════════════════════════════════════════════════════════════
# TAB 5 — Pregătire Examen
# ══════════════════════════════════════════════════════════════════════════════
with tab_exam:
    st.subheader("📝 Cum prezinți proiectul la examen")

    st.markdown(
        """
        ### Structura prezentării (5 minute)

        **1. Problema (30 sec)**
        > *"Utilizatorii din sală nu știu ce greutate să aleagă la sesiunea următoare.
        > Nu există personalizare bazată pe date reale."*

        **2. Soluția (30 sec)**
        > *"Am construit o aplicație Python care stochează istoricul antrenamentelor
        > și folosește machine learning pentru recomandări personalizate."*

        **3. Componenta AI (1.5 min)**
        - Model: `RandomForestRegressor` din `scikit-learn`
        - Input: **7 feature-uri** extrase din istoricul utilizatorului
        - Output: greutatea + repetările sugerate pentru sesiunea următoare
        - Evaluare: MAE pe split 80/20 cronologic
        - Comparație: RandomForest vs GradientBoosting vs Ridge

        **4. Demo live (2 min)**
        1. Click **"Încarcă seed data"** — 14 săptămâni de antrenamente generate
        2. Click **"Antrenează modelul AI"**
        3. Tab **AI Coach** → selectezi un exercițiu → arăți recomandarea + graficul
        4. Expander **Feature Importance** → explici ce contează în model
        5. Expander **Comparație modele** → arăți că RF câștigă față de Ridge
        6. Tab **Recorduri** → arăți PRs și analiza de stagnare

        **5. Concluzii (30 sec)**
        > *"Proiectul rulează local, are o componentă AI reală și vizibilă,
        > evaluare cantitativă și poate fi extins cu autentificare sau deploy online."*
        """
    )

    st.divider()

    col_q, col_p = st.columns(2)

    with col_q:
        st.markdown(
            """
            **Întrebări probabile de la evaluator:**

            ❓ *De ce RandomForest și nu un model simplu?*
            → RF gestionează date tabulare mici, nu necesită normalizare,
            rezistă la outlieri și oferă feature importance nativ.

            ❓ *Cum știi că modelul funcționează?*
            → MAE afișată în interfață. Comparăm și cu alte două modele.

            ❓ *Ce face feature engineering-ul?*
            → Transformă seriile brute în caracteristici per sesiune:
            volum, trend pe 3 sesiuni, număr sesiuni acumulate.

            ❓ *Cum detectezi stagnarea?*
            → Dacă spread-ul greutăților în ultimele 4 sesiuni e sub 2,5 kg,
            aplicația afișează o alertă și sugerează o creștere.
            """
        )

    with col_p:
        st.markdown(
            """
            **Puncte forte ale proiectului:**

            ✅ Componentă AI reală și explicabilă  
            ✅ Pipeline complet: date → features → model → predicție → UI  
            ✅ Evaluare cantitativă (MAE pe test set cronologic)  
            ✅ Comparație între 3 modele  
            ✅ Feature importance vizualizată  
            ✅ Detecție automată stagnare / oboseală  
            ✅ Recorduri personale cu istoric  
            ✅ 100% Python, rulare locală  
            ✅ 1 000+ rânduri de seed data realistă  

            **Idei de extensie:**
            - autentificare multi-user
            - export PDF cu raport de progres
            - deploy pe Streamlit Cloud
            - notificări email la stagnare
            - predicție pe baza planului de antrenament
            """
        )
