# v0.0.0-no-state
﻿
// êîíñòàíòû
var MaxScores = 6;
var WaitingModeSeconts = 10;
var BuildModeSeconds = 30;
var GameModeSeconds = 120;
var EndGameSeconds = 5;
var EndOfMatchTime = 10;

// êîíñòàíòû èìåí
var WaitingStateValue = "Waiting";
var BuildModeStateValue = "BuildMode";
var GameStateValue = "Game";
var EndOfGameStateValue = "EndOfGame";
var EndOfMatchStateValue = "EndOfMatch";
var scoresProp = "Scores";

// ïîñòîÿííûå ïåðåìåííûå
var mainTimer = Timers.GetContext().Get("Main");
var stateProp = Properties.GetContext().Get("State");
var winTeamIdProp = Properties.GetContext().Get("WinTeam");

// ïðèìåíÿåì ïàðàìåòðû ñîçäàíèÿ êîìíàòû
Damage.GetContext().FriendlyFire.Value = GameMode.Parameters.GetBool("FriendlyFire");
Map.Rotation = GameMode.Parameters.GetBool("MapRotation");
BreackGraph.OnlyPlayerBlocksDmg = GameMode.Parameters.GetBool("PartialDesruction");
BreackGraph.WeakBlocks = GameMode.Parameters.GetBool("LoosenBlocks");

// áëîê èãðîêà âñåãäà óñèëåí
BreackGraph.PlayerBlockBoost = true;

// âûêëþ÷àåì óðîí ãðàíàòû ïðè êàñàíèè
Damage.GetContext().GranadeTouchExplosion.Value = false;

// ïàðàìåòðû èãðû
Properties.GetContext().GameModeName.Value = "GameModes/Team Dead Match";
TeamsBalancer.IsAutoBalance = true; // âêë àâòîáàëàíñ äî íà÷àëà êàòêè
Ui.GetContext().MainTimerId.Value = mainTimer.Id;
// ñîçäàåì êîìàíäû
Teams.Add("Blue", "Teams/Blue", { b: 1 });
Teams.Add("Red", "Teams/Red", { r: 1 });
Teams.Get("Blue").Spawns.SpawnPointsGroups.Add(1);
Teams.Get("Red").Spawns.SpawnPointsGroups.Add(2);
Teams.Get("Red").Build.BlocksSet.Value = BuildBlocksSet.Red;
Teams.Get("Blue").Build.BlocksSet.Value = BuildBlocksSet.Blue;

// çàäàåì ÷òî âûâîäèòü â ëèäåðáîðäàõ
LeaderBoard.PlayerLeaderBoardValues = [
        {
                Value: "Kills",
                DisplayName: "Statistics/Kills",
                ShortDisplayName: "Statistics/KillsShort"
        },
        {
                Value: "Deaths",
                DisplayName: "Statistics/Deaths",
                ShortDisplayName: "Statistics/\DeathsShort"
        },
        {
                Value: "Scores",
                DisplayName: "Statistics/Scores",
                ShortDisplayName: "Statistics/ScoresShort"
        }
];
LeaderBoard.TeamLeaderBoardValue = {
        Value: scoresProp,
        DisplayName: "Statistics\Scores",
        ShortDisplayName: "Statistics\ScoresShort"
};
// âåñ êîìàíäû â ëèäåðáîðäå
LeaderBoard.TeamWeightGetter.Set(function(team) {
        var prop = team.Properties.Get(scoresProp);
        if (prop.Value == null) return 0;
        return prop.Value;
});
// âåñ èãðîêà â ëèäåðáîðäå
LeaderBoard.PlayersWeightGetter.Set(function(player) {
        var prop = player.Properties.Get("Scores");
        if (prop.Value == null) return 0;
        return prop.Value;
});

// çàäàåì ÷òî âûâîäèòü ââåðõó
Ui.GetContext().TeamProp1.Value = { Team: "Blue", Prop: scoresProp };
Ui.GetContext().TeamProp2.Value = { Team: "Red", Prop: scoresProp };

// âûâîäèì 0 ââåðõó
for (e = Teams.GetEnumerator(); e.MoveNext();) {
        e.Current.Properties.Get(scoresProp).Value= 0;
}

// ðàçðåøàåì âõîä â êîìàíäû ïî çàïðîñó
Teams.OnRequestJoinTeam.Add(function(player,team){team.Add(player);});
// ñïàâí ïî âõîäó â êîìàíäó
Teams.OnPlayerChangeTeam.Add(function(player) {
        //if (stateProp.value === GameStateValue) 
        //        return;
        player.Spawns.Spawn();
});

// ñ÷åò÷èê ñìåðòåé
Damage.OnDeath.Add(function(player) {
        ++player.Properties.Deaths.Value;
});
// ñ÷åò÷èê óáèéñòâ
Damage.OnKill.Add(function(player, killed) {
        if (killed.Team != null && killed.Team != player.Team) {
                ++player.Properties.Kills.Value;
                player.Properties.Scores.Value += 100;
        }
});

// ïðîâåðÿåì âûèãðûø êîìàíäû
function GetWinTeam(){
        winTeam = null;
        wins = 0;
        noAlife = true;
        for (e = Teams.GetEnumerator(); e.MoveNext();) {
                if (e.Current.GetAlivePlayersCount() > 0) {
                        ++wins;
                        winTeam = e.Current;
                }
        }
        if (wins === 1) return winTeam;
        else return null;
}
function TrySwitchGameState() // ïîïûòêà ïåðåêëþ÷åíèÿ èç ãåéìñòåéòà
{
        if (stateProp.value !== GameStateValue) 
                return;

        // àíàëèç êîìàíä
        winTeam = null;
        wins = 0;
        alifeCount = 0;
        hasEmptyTeam = false;
        for (e = Teams.GetEnumerator(); e.MoveNext();) {
                var alife = e.Current.GetAlivePlayersCount();
                alifeCount += alife;
                if (alife > 0) {
                        ++wins;
                        winTeam = e.Current;
                }
                if (e.Current.Count == 0) hasEmptyTeam = true;
        }

        // åñòü ïîáåäèâøàÿ êîìàíäà
        if (!hasEmptyTeam && alifeCount > 0 && wins === 1) {
                log.debug("hasEmptyTeam=" + hasEmptyTeam);
                log.debug("alifeCount=" + alifeCount);
                log.debug("wins=" + wins);
                winTeamIdProp.Value = winTeam.Id;
                StartEndOfGame(winTeam);
                return;
        }

        // ïîáåäèâøèõ íåò è æèâûõ íå îñòàëîñü - íè÷üÿ
        if (alifeCount == 0) {
                log.debug("ïîáåäèâøèõ íåò è æèâûõ íå îñòàëîñü - íè÷üÿ");
                winTeamIdProp.Value = null;
                StartEndOfGame(null);
        }

        // ïîáåäèâøèõ íåò è îñíîâíîé òàéìåð çàêîí÷åí - íè÷üÿ
        if (!mainTimer.IsStarted) {
                log.debug("ïîáåäèâøèõ íåò è òàéìåð íå àêòèâåí - íè÷üÿ");
                winTeamIdProp.Value = null;
                StartEndOfGame(null);
        }
}
function OnGameStateTimer() // ïðîâåðêà âûèãðûøà ãåéìà
{
        TrySwitchGameState();
}
Damage.OnDeath.Add(TrySwitchGameState);
Players.OnPlayerDisconnected.Add(TrySwitchGameState);

// íàñòðîéêà ïåðåêëþ÷åíèÿ ðåæèìîâ
mainTimer.OnTimer.Add(function() {
        switch (stateProp.value) {
        case WaitingStateValue:
                SetBuildMode();
                break;
        case BuildModeStateValue:
                SetGameMode();
                break;
        case GameStateValue:
                OnGameStateTimer();
                break;
        case EndOfGameStateValue:
                EndEndOfGame();
                break;
        case EndOfMatchStateValue:
                RestartGame();
                break;
        }
});

// çàäàåì ïåðâîå èãðîâîå ñîñòîÿíèå
SetWaitingMode();

// ñîñòîÿíèÿ èãðû
function SetWaitingMode() { // ñîñòîÿíèå îæèäàíèÿ äðóãèõ èãðîêîâ
        stateProp.value = WaitingStateValue;
        Ui.GetContext().Hint.Value = "Hint/WaitingPlayers";
        Spawns.GetContext().enable = false;
        TeamsBalancer.IsAutoBalance = true;
        mainTimer.Restart(WaitingModeSeconts);
}

function SetBuildMode() 
{
        stateProp.value = BuildModeStateValue;
        Ui.GetContext().Hint.Value = "Hint/BuildBase";

        var inventory = Inventory.GetContext();
        inventory.Main.Value = false;
        inventory.Secondary.Value = false;
        inventory.Melee.Value = true;
        inventory.Explosive.Value = false;
        inventory.Build.Value = true;

        mainTimer.Restart(BuildModeSeconds);
        Spawns.GetContext().enable = true;
        TeamsBalancer.IsAutoBalance = true; // âêë àâòîáàëàíñ äî íà÷àëà êàòêè
        SpawnTeams();
}
function SetGameMode() 
{
        stateProp.value = GameStateValue;
        Ui.GetContext().Hint.Value = "Hint/AttackEnemies";
        winTeamIdProp.Value = null; // íèêòî íå âûèãðàë

        var inventory = Inventory.GetContext();
        if (GameMode.Parameters.GetBool("OnlyKnives")) {
                inventory.Main.Value = false;
                inventory.Secondary.Value = false;
                inventory.Melee.Value = true;
                inventory.Explosive.Value = false;
                inventory.Build.Value = true;
        } else {
                inventory.Main.Value = true;
                inventory.Secondary.Value = true;
                inventory.Melee.Value = true;
                inventory.Explosive.Value = true;
                inventory.Build.Value = true;
        }

        mainTimer.Restart(GameModeSeconds);
        Spawns.GetContext().Despawn();
        Spawns.GetContext().RespawnEnable = false;
        TeamsBalancer.IsAutoBalance = false;
        TeamsBalancer.BalanceTeams();
        SpawnTeams();
}

function StartEndOfGame(team) { // team=null òî íè÷üÿ
        log.debug("win team="+team);
        stateProp.value = EndOfGameStateValue;
        if (team !== null) {
                log.debug(1);
                Ui.GetContext().Hint.Value = team + " wins!";
                 var prop = team.Properties.Get(scoresProp);
                 if (prop.Value == null) prop.Value = 1;
                 else prop.Value = prop.Value + 1;
        }
        else Ui.GetContext().Hint.Value = "Hint/Draw";

        mainTimer.Restart(EndGameSeconds);
}
function EndEndOfGame(){// êîíåö êîíöà ìàò÷à
        if (winTeamIdProp.Value !== null) {
                var team = Teams.Get(winTeamIdProp.Value);
                var prop = team.Properties.Get(scoresProp);
                if (prop.Value >= MaxScores) SetEndOfMatchMode();
                else SetGameMode();
        }
        else SetGameMode();
}

function SetEndOfMatchMode() {
        stateProp.value = EndOfMatchStateValue;
        Ui.GetContext().Hint.Value = "Hint/EndOfMatch";

        var context = Spawns.GetContext();
        context.enable = false;
        context.Despawn();
        Game.GameOver(LeaderBoard.GetTeams());
        mainTimer.Restart(EndOfMatchTime);
}
function RestartGame() {
        Game.RestartGame();
}

function SpawnTeams() {
        var e = Teams.GetEnumerator();
        while (e.moveNext()) {
                Spawns.GetContext(e.Current).Spawn();
        }
}