import * as room from "pixel_combats/room"
room.Players.OnPlayerConnected.Add(function(p){}
room.Teams.OnRequestJoinTeam.Add(function(p.t){ t.Add(p) })
room.Teams.OnPlayerChangeTeam.Add(())
room.Teams.Add("Red","красные",new basic.Color(1,0,0,1)