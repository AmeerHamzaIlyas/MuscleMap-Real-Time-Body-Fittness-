namespace MuscleMap.Web.Models;

public class AppUser
{
    public string Email { get; set; } = "";
    public string Name { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public UserPreference? Preference { get; set; }
    public UserCameraPoses? CameraPoses { get; set; }
    public ICollection<UserFavorite> Favorites { get; set; } = new List<UserFavorite>();
}

public class UserPreference
{
    public string Email { get; set; } = "";
    public string Theme { get; set; } = "dark";
    public string Units { get; set; } = "metric";
    public string DefaultDifficulty { get; set; } = "All";
    public bool Animations { get; set; } = true;
    public bool ShowWorkoutTips { get; set; } = true;

    public AppUser? User { get; set; }
    public string? PosesJson { get; internal set; }
}

public class UserFavorite
{
    public int Id { get; set; }
    public string UserEmail { get; set; } = "";
    public string Muscle { get; set; } = "";
    public string ExerciseName { get; set; } = "";

    public AppUser? User { get; set; }
}
