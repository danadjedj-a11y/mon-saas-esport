 ============================================================
 TESTS POUR VALIDATION BACKEND - TRIGGERS SQL
 ============================================================
 Ce fichier contient des tests pour vérifier que les triggers fonctionnent correctement
 Exécutez ces tests UN PAR UN pour vérifier chaque validation

 ============================================================
 TEST 1 : Validation des Tournois
 ============================================================

 Test 1.1 : Nom trop long (> 100 caractères) - DEVRAIT ÉCHOUER
 Décommentez la ligne suivante pour tester :
INSERT INTO tournaments (name, owner_id, status, format) 
VALUES ('A' || REPEAT('B', 100), '00000000-0000-0000-0000-000000000000', 'draft', 'elimination');

 Test 1.2 : Format invalide - DEVRAIT ÉCHOUER
INSERT INTO tournaments (name, owner_id, status, format) 
VALUES ('Test Tournament', '00000000-0000-0000-0000-000000000000', 'draft', 'invalid_format');

 Test 1.3 : Max participants < 2 - DEVRAIT ÉCHOUER
 INSERT INTO tournaments (name, owner_id, status, format, max_participants) 
 VALUES ('Test Tournament', '00000000-0000-0000-0000-000000000000', 'draft', 'elimination', 1);

 Test 1.4 : Max participants > 1000 - DEVRAIT ÉCHOUER
 INSERT INTO tournaments (name, owner_id, status, format, max_participants) 
 VALUES ('Test Tournament', '00000000-0000-0000-0000-000000000000', 'draft', 'elimination', 1001);

 Test 1.5 : Règlement trop long (> 5000 caractères) - DEVRAIT ÉCHOUER
 INSERT INTO tournaments (name, owner_id, status, format, rules) 
 VALUES ('Test Tournament', '00000000-0000-0000-0000-000000000000', 'draft', 'elimination', REPEAT('A', 5001));

 Test 1.6 : Best_of < 1 ou > 7 - DEVRAIT ÉCHOUER
 INSERT INTO tournaments (name, owner_id, status, format, best_of) 
 VALUES ('Test Tournament', '00000000-0000-0000-0000-000000000000', 'draft', 'elimination', 8);

 ============================================================
 TEST 2 : Validation des Équipes
 ============================================================

 Test 2.1 : Nom trop long (> 50 caractères) - DEVRAIT ÉCHOUER
 INSERT INTO teams (name, tag, captain_id) 
 VALUES ('A' || REPEAT('B', 50), 'TAG', '00000000-0000-0000-0000-000000000000');

 Test 2.2 : Tag trop court (< 2 caractères) - DEVRAIT ÉCHOUER
 INSERT INTO teams (name, tag, captain_id) 
 VALUES ('Test Team', 'A', '00000000-0000-0000-0000-000000000000');

 Test 2.3 : Tag trop long (> 5 caractères) - DEVRAIT ÉCHOUER
 INSERT INTO teams (name, tag, captain_id) 
 VALUES ('Test Team', 'TAGLONG', '00000000-0000-0000-0000-000000000000');

 ============================================================
 TEST 3 : Validation des Messages
 ============================================================

 Test 3.1 : Message trop long (> 500 caractères) - DEVRAIT ÉCHOUER
 INSERT INTO messages (content, user_id, tournament_id) 
 VALUES (REPEAT('A', 501), '00000000-0000-0000-0000-000000000000', 1);

 Test 3.2 : Message vide - DEVRAIT ÉCHOUER
 INSERT INTO messages (content, user_id, tournament_id) 
 VALUES ('   ', '00000000-0000-0000-0000-000000000000', 1);

 Test 3.3 : Ni tournament_id ni match_id - DEVRAIT ÉCHOUER
 INSERT INTO messages (content, user_id) 
 VALUES ('Test message', '00000000-0000-0000-0000-000000000000');

 ============================================================
 TEST 4 : Validation des Scores
 ============================================================

 Test 4.1 : Score négatif - DEVRAIT ÉCHOUER
 INSERT INTO matches (tournament_id, player1_id, player2_id, score_p1, score_p2, status) 
 VALUES (1, 1, 2, -1, 5, 'completed');

 Test 4.2 : Score > 999 - DEVRAIT ÉCHOUER
 INSERT INTO matches (tournament_id, player1_id, player2_id, score_p1, score_p2, status) 
 VALUES (1, 1, 2, 1000, 5, 'completed');

 ============================================================
 NOTES IMPORTANTES
 ============================================================
 1. Pour tester, remplacez les UUIDs par des IDs valides de votre base de données
 2. Pour les tests de tournois, utilisez un owner_id existant
 3. Pour les tests de messages, utilisez un tournament_id ou match_id existant
 4. Si un test "devrait échouer" mais réussit, cela signifie que le trigger ne fonctionne pas correctement
 5. Si un test échoue avec une erreur de validation, c'est normal et attendu

 ============================================================
 VÉRIFICATION DES TRIGGERS
 ============================================================
 Pour vérifier que les triggers existent, exécutez cette requête :

SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE 'trigger_validate%'
ORDER BY event_object_table, trigger_name;

 Vous devriez voir :
 - trigger_validate_tournament (sur tournaments)
 - trigger_validate_team (sur teams)
 - trigger_validate_message (sur messages)
 - trigger_validate_match_score (sur matches)
 - trigger_validate_game_score (sur match_games, si la table existe)

