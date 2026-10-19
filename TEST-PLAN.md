# JARVIS 2KR — plan de validation pré-publication

## Tests automatiques locaux

- [ ] `npm install` termine sans erreur.
- [ ] `npm run check` passe.
- [ ] `npm run build` produit `dist/`.
- [ ] Aucun secret privé n'est présent dans les fichiers versionnés.

## Tests Supabase Auth et RLS

Créer les utilisateurs A et B avec deux adresses contrôlées.

- [ ] A peut créer et lire ses mémoires/tâches/conversations/messages.
- [ ] B ne peut pas lire les lignes de A, même en connaissant leurs UUID.
- [ ] B ne peut pas modifier ou supprimer les lignes de A.
- [ ] Un utilisateur ne peut pas ajouter un message à une conversation qui ne lui appartient pas.
- [ ] Un utilisateur anonyme ne peut lire aucune table privée.
- [ ] Le trigger crée un profil lors de l'inscription.

## Tests Edge Function

- [ ] POST sans Authorization → 401.
- [ ] Jeton invalide/expiré → 401.
- [ ] `action` inconnue → 400.
- [ ] Tout fournisseur autre qu’OpenRouter → 400.
- [ ] OpenRouter sans secret → 503.
- [ ] `conversation_id` appartenant à un autre compte → 403.
- [ ] Message vide, trop long ou trop de messages → rejet.
- [ ] Clé et réponse d'IA ne sont jamais journalisées par le frontend.
- [ ] Une réponse valide retourne `content`, `provider` et `model`, et le modèle demandé reste verrouillé sur `openrouter/free`.

## Tests interface

- [ ] Inscription, confirmation e-mail et connexion.
- [ ] Déconnexion puis connexion persistante après rechargement.
- [ ] Création/édition de tâches et mise à jour de statut.
- [ ] Création/suppression de mémoire.
- [ ] Nouvelle conversation et envoi de messages via `openrouter/free`.
- [ ] Affichage d'erreurs provider/quota sans plantage.
- [ ] Responsive mobile/tablette/desktop.
- [ ] Micro et lecture vocale uniquement après autorisation du navigateur.

Ne publie pas l'inscription ouverte avant d'avoir terminé les tests croisés A/B et vérifié les limites d'usage.
