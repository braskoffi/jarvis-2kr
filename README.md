# JARVIS 2KR — Command Center 3.0

Interface futuriste de centre de commande, inspirée de la capture de référence : palette bleu nuit/cyan, cœur holographique, agents, flux d'activité, mémoire, tâches, conversations et commandes rapides. Frontend Vite déployable sur Vercel, Auth/DB/Edge Functions sur Supabase et dépôt source GitHub.

> **État honnête :** le dépôt est préparé pour être configuré et déployé. Il n'est pas publié sur tes comptes et aucun appel réel à tes fournisseurs d'IA n'a été possible sans tes secrets. L'interface, les scripts et le schéma doivent passer les tests dans TON projet Supabase avant d'ouvrir l'inscription au public.

## Architecture

- `src/` : application frontend et styles responsive. La clé Supabase publique (publishable/anon) peut être utilisée côté navigateur uniquement avec RLS activé.
- `supabase/migrations/` : tables PostgreSQL, index, triggers et politiques Row Level Security.
- `supabase/functions/jarvis-chat/` : fonction authentifiée qui route les requêtes vers le routeur gratuit `openrouter/free` uniquement. Les clés fournisseurs restent dans les secrets Supabase.
- `vercel.json` : configuration du build Vite et quelques en-têtes de sécurité.

## Prérequis

- Node.js 20 ou plus récent et npm
- Comptes GitHub, Vercel et Supabase
- Une clé API OpenRouter gratuite (et aucun crédit payant nécessaire pour utiliser le modèle `openrouter/free`)
- Supabase CLI pour appliquer les migrations et déployer l'Edge Function

## 1. Installer et lancer localement

```bash
npm install
cp .env.example .env.local
```

Sous Windows PowerShell :

```powershell
Copy-Item .env.example .env.local
```

Renseigne dans `.env.local` :

```dotenv
VITE_SUPABASE_URL=https://TON-PROJET.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_... 
```

Les anciennes clés Supabase `anon` JWT fonctionnent également. Ne mets **jamais** de clé `service_role`, de clé secrète Supabase ou de clé OpenRouter dans `VITE_*`, le code source ou GitHub.

Puis :

```bash
npm run dev
```

Vite affiche l'URL locale. Redémarre Vite après chaque modification des variables `.env.local`.

## 2. Configurer Supabase

1. Crée un projet Supabase.
2. Dans **Project Settings → API**, copie l'URL et la clé publishable/anon dans `.env.local`.
3. Installe la CLI Supabase et connecte-la :

```bash
npm install --global supabase
supabase login
supabase link --project-ref TON_PROJECT_REF
```

4. Applique la migration versionnée :

```bash
supabase db push
```

Alternative : ouvre le SQL Editor Supabase et exécute intégralement `supabase/migrations/20261019000100_jarvis_schema.sql`.

5. Dans **Authentication → URL Configuration**, ajoute l'URL locale `http://localhost:5173` et, après déploiement, ton domaine Vercel dans les URLs autorisées. Configure le site URL et les liens de confirmation e-mail selon ton domaine de production.
6. Pour un site public, règle les options de sécurité Auth, l'e-mail de confirmation et les limites d'inscription selon ton besoin. Vérifie que la confirmation e-mail fonctionne avant d'annoncer le lancement.

### Tables et RLS

La migration crée `profiles`, `conversations`, `messages`, `memories`, `tasks` et `activity_events`. Toutes ont RLS activé. Les politiques utilisent `auth.uid()` et les messages vérifient également que la conversation parent appartient au même utilisateur. Les rôles anonymes n'ont aucun droit sur les tables.

**Important :** ne désactive pas RLS pour résoudre une erreur d'accès. Vérifie plutôt que la migration est appliquée et que la requête utilise une session authentifiée. Les données des comptes sont séparées par `user_id`.

## 3. Configurer une IA gratuite uniquement

JARVIS est volontairement verrouillé sur **OpenRouter Free Router** (`openrouter/free`). Ce routeur choisit un modèle gratuit disponible et affiche les résultats via une API. Le serveur ignore le modèle envoyé par le navigateur et fixe lui-même `openrouter/free` : il ne peut donc pas basculer vers OpenAI, Claude, Gemini payant ou un modèle payant OpenRouter.

La tarification officielle d'OpenRouter indique que `openrouter/free` est à 0 $ pour les tokens d'entrée et de sortie. Le niveau gratuit a toutefois des limites de débit et de disponibilité, qui peuvent changer ; « gratuit » ne signifie pas illimité ni garanti 24 h/24. Voir : https://openrouter.ai/openrouter/free et https://openrouter.ai/pricing/.

1. Crée un compte gratuit sur https://openrouter.ai/.
2. Crée une API key dans ton tableau de bord OpenRouter. N'achète pas de crédits et ne configure aucun modèle payant.
3. Déploie la fonction puis ajoute seulement cette clé comme secret Supabase :

```bash
supabase functions deploy jarvis-chat --no-verify-jwt
supabase secrets set OPENROUTER_API_KEY=ta_cle_openrouter
supabase secrets set APP_ORIGIN=https://TON-DOMAINE.vercel.app
```

4. Redéploie la fonction après toute modification du code :

```bash
supabase functions deploy jarvis-chat --no-verify-jwt
```

La fonction vérifie le jeton de session avec `supabase.auth.getUser(token)`, vérifie que la conversation appartient au compte connecté et n'utilise aucune clé `service_role`. `verify_jwt = false` est utilisé parce que la fonction effectue elle-même la vérification explicite du bearer token ; elle rejette les appels non authentifiés.

**Confidentialité :** les prompts sont envoyés à OpenRouter et à l'un des fournisseurs de modèles gratuits sélectionnés par son routeur. Consulte les conditions du fournisseur avant d'envoyer des données sensibles ; certains modèles gratuits peuvent conserver les prompts ou les utiliser pour améliorer leurs modèles. N'envoie pas de mots de passe, de données de santé, d'informations financières ou d'autres données confidentielles.

## 4. Publier sur GitHub

Depuis le dossier du projet :

```bash
git init
git add .
git commit -m "Initial JARVIS 2KR command center"
git branch -M main
git remote add origin https://github.com/TON-UTILISATEUR/jarvis-2kr.git
git push -u origin main
```

Crée d'abord le dépôt vide sur GitHub. Ne pousse pas `.env.local`, des clés API, des exports de base de données ou des secrets. Le `.gitignore` exclut les fichiers d'environnement usuels.

## 5. Déployer sur Vercel

1. Connecte-toi à Vercel et choisis **Add New → Project**.
2. Importe le dépôt GitHub.
3. Framework : Vite. Build command : `npm run build`. Output directory : `dist`.
4. Dans **Environment Variables**, ajoute pour Production et Preview les variables publiques nécessaires :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Clique **Deploy**. Chaque push sur la branche liée déclenchera un nouveau déploiement.
6. Ajoute le domaine Vercel dans Supabase Auth URL Configuration et définis `APP_ORIGIN` à l'origine exacte du site public.
7. Vérifie le site déployé en navigation privée et depuis un second compte de test.

Les secrets d'IA sont définis dans Supabase Edge Functions, pas dans les variables frontend Vercel. Ne copie pas une clé `service_role` dans Vercel pour cette architecture.

## 6. Tests avant publication

### Contrôles locaux

```bash
npm run check
npm run build
```

### Contrôles manuels indispensables

1. Crée deux comptes de test distincts, A et B.
2. Depuis A, crée une mémoire, une tâche et une conversation.
3. Connecte-toi comme B : aucune donnée de A ne doit apparaître.
4. Depuis les outils/API Supabase en étant authentifié comme B, tente de sélectionner ou modifier une ligne appartenant à A : RLS doit refuser l'accès ou renvoyer zéro ligne.
5. Déconnecté, tente de lire les tables : aucun accès anonyme ne doit être accordé.
6. Appelle la fonction `jarvis-chat` sans jeton : elle doit répondre `401`.
7. Connecté, vérifie l'action `providers`, puis un message avec chaque fournisseur configuré.
8. Teste une clé incorrecte, un modèle indisponible et les erreurs de quota : l'application doit afficher une erreur, sans révéler la clé.
9. Vérifie les confirmations e-mail, la réinitialisation de mot de passe si activée, la déconnexion et l'expiration de session.
10. Sur iPhone et ordinateur : teste les tailles d'écran, le clavier du chat et les permissions micro. La dictée dépend du navigateur et du contexte HTTPS.

Pour afficher les journaux de la fonction : Supabase Dashboard → Edge Functions → `jarvis-chat` → Logs.

### Limites à connaître

- La fonction IA a des limites de taille et de nombre de messages, mais une protection anti-abus avancée (quotas par utilisateur, facturation, rate limiting distribué, CAPTCHA d'inscription) doit être ajoutée avant un lancement public à fort trafic.
- Les conversations sont sauvegardées par le frontend dans Supabase après l'appel IA. Pour une fiabilité de production supérieure, ajouter des mécanismes de reprise et une gestion des appels idempotents.
- Les fonctionnalités « Calendar », agents et workflows sont des modules d'interface/raccourcis. Il n'y a pas encore de synchronisation Google Calendar, d'agent navigateur autonome, d'exécution de code arbitraire ou de tâches planifiées en arrière-plan.
- Le flux d'activité et les indicateurs sont des métriques applicatives, pas un accès aux métriques réelles de la machine.
- Une disponibilité publique exige de vérifier la conformité, la politique de confidentialité, les conditions des fournisseurs IA, la facturation, les quotas et la gestion des données utilisateurs.

## Dépannage rapide

- **Configuration Supabase requise** : variables `VITE_*` manquantes ou serveur Vite non redémarré.
- **Table introuvable** : migration non appliquée ou mauvais projet Supabase lié.
- **401 sur la fonction** : session expirée, jeton manquant ou configuration Auth invalide.
- **403 conversation** : l'identifiant ne correspond pas à une conversation du compte connecté.
- **503 fournisseur non configuré** : ajoute le secret dans Supabase et redéploie la fonction si nécessaire.
- **Erreur de modèle/quota** : vérifie le modèle, la facturation et les permissions du fournisseur.
- **Compte créé sans connexion immédiate** : si la confirmation e-mail est activée, ouvre le lien de confirmation avant de te connecter.

## Licence

Aucune licence open source n'est ajoutée par défaut. Choisis une licence adaptée avant de rendre le dépôt public.
