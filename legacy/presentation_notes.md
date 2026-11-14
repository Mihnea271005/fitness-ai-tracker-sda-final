# Prezentare Examen

## Problema
Multi utilizatori din sala isi noteaza antrenamentele, dar nu stiu exact ce greutate sa aleaga la urmatoarea sesiune.

## Solutia
Am construit o aplicatie in Python care:
- stocheaza exercitii, serii, repetari si greutati
- vizualizeaza progresul
- foloseste un model de machine learning pentru a recomanda greutatea si repetarile urmatoare

## Componenta AI
Modelul foloseste:
- exercitiul
- greutatea maxima anterioara
- repetarile medii
- volumul total
- numarul de serii
- zilele de pauza dintre sesiuni

Iesirea este:
- greutate recomandata
- repetari recomandate

## De ce acest proiect
- este mai realist si mai fezabil decat next-token prediction
- se antreneaza local, rapid
- AI-ul este vizibil direct in produs
- este usor de explicat evaluatorului

## Demo in 3 pasi
1. Incarc seed data sau introduc manual cateva sesiuni.
2. Antrenez modelul.
3. Selectez un exercitiu si afisez recomandarea AI.

## Limitari
- modelul depinde de calitatea si cantitatea datelor
- este gandit pentru un singur utilizator
- nu inlocuieste un antrenor uman
