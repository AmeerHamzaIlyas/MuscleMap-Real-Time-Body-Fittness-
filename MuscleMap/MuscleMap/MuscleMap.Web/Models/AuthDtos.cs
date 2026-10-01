namespace MuscleMap.Web.Models;

public record RegisterRequest(string Name, string Email, string Password);
public record LoginRequest(string Email, string Password);
public record UserSessionDto(string Name, string Email);
public record PreferencesDto(
    string Theme,
    string Units,
    string DefaultDifficulty,
    bool Animations,
    bool ShowWorkoutTips);
