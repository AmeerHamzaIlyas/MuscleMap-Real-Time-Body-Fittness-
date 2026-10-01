namespace MuscleMap.Web.Models;

public class UserCameraPoses
{
    public string Email { get; set; } = "";
    public string PosesJson { get; set; } = "{}";

    public AppUser? User { get; set; }
}
