using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MuscleMap.Web.Data;
using MuscleMap.Web.Models;

namespace MuscleMap.Web.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class UserController : ControllerBase
{
    private readonly AppDbContext _db;

    public UserController(AppDbContext db) => _db = db;

    private string? CurrentEmail => User.FindFirstValue(ClaimTypes.Email);

    [HttpGet("profile")]
    public async Task<ActionResult<object>> GetProfile()
    {
        var email = CurrentEmail;
        if (email == null) return Unauthorized();

        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == email);

        if (user == null) return NotFound();

        return Ok(new
        {
            user.Name,
            user.Email,
            user.CreatedAt,
        });
    }

    [HttpGet("preferences")]
    public async Task<ActionResult<PreferencesDto>> GetPreferences()
    {
        var email = CurrentEmail;
        if (email == null) return Unauthorized();

        var prefs = await _db.Preferences.FindAsync(email);
        if (prefs == null)
        {
            prefs = new UserPreference { Email = email };
            _db.Preferences.Add(prefs);
            await _db.SaveChangesAsync();
        }

        return Ok(ToDto(prefs));
    }

    [HttpPut("preferences")]
    public async Task<ActionResult<PreferencesDto>> SavePreferences([FromBody] PreferencesDto dto)
    {
        var email = CurrentEmail;
        if (email == null) return Unauthorized();

        var prefs = await _db.Preferences.FindAsync(email);
        if (prefs == null)
        {
            prefs = new UserPreference { Email = email };
            _db.Preferences.Add(prefs);
        }

        prefs.Theme = dto.Theme;
        prefs.Units = dto.Units;
        prefs.DefaultDifficulty = dto.DefaultDifficulty;
        prefs.Animations = dto.Animations;
        prefs.ShowWorkoutTips = dto.ShowWorkoutTips;

        await _db.SaveChangesAsync();
        return Ok(ToDto(prefs));
    }

    [HttpGet("favorites")]
    public async Task<ActionResult<string[]>> GetFavorites()
    {
        var email = CurrentEmail;
        if (email == null) return Unauthorized();

        var items = await _db.Favorites
            .AsNoTracking()
            .Where(f => f.UserEmail == email)
            .Select(f => f.Muscle + "::" + f.ExerciseName)
            .ToListAsync();

        return Ok(items.ToArray());
    }

    [HttpPut("favorites")]
    public async Task<ActionResult> SaveFavorites([FromBody] string[] items)
    {
        var email = CurrentEmail;
        if (email == null) return Unauthorized();

        var existing = await _db.Favorites.Where(f => f.UserEmail == email).ToListAsync();
        _db.Favorites.RemoveRange(existing);

        foreach (var id in items.Distinct())
        {
            var parts = id.Split("::", 2);
            if (parts.Length != 2) continue;

            _db.Favorites.Add(new UserFavorite
            {
                UserEmail = email,
                Muscle = parts[0],
                ExerciseName = parts[1],
            });
        }

        await _db.SaveChangesAsync();
        return Ok(new { count = items.Length });
    }

    [HttpGet("camera-poses")]
    public async Task<ActionResult<Dictionary<string, JsonElement>>> GetCameraPoses()
    {
        var email = CurrentEmail;
        if (email == null) return Unauthorized();
        var prefs = await _db.Preferences
    .FirstOrDefaultAsync(x => x.Email == email);
        //var row = await _db.CameraPoses.FindAsync(email);
        if (prefs == null || string.IsNullOrWhiteSpace(prefs.PosesJson))
            return Ok(new Dictionary<string, JsonElement>());

        try
        {
            var poses = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(prefs.PosesJson);
            return Ok(poses ?? new Dictionary<string, JsonElement>());
        }
        catch
        {
            return Ok(new Dictionary<string, JsonElement>());
        }
    }

    [HttpPut("camera-poses")]
    public async Task<IActionResult> SaveCameraPoses([FromBody] JsonElement body)
    {
        var email = CurrentEmail;
        if (email == null) return Unauthorized();

        if (body.ValueKind != JsonValueKind.Object)
            return BadRequest(new { message = "Expected a JSON object of muscle poses." });

        var json = body.GetRawText();
        var row = await _db.CameraPoses.FindAsync(email);
        if (row == null)
        {
            row = new UserCameraPoses { Email = email, PosesJson = json };
            _db.CameraPoses.Add(row);
        }
        else
        {
            row.PosesJson = json;
        }

        await _db.SaveChangesAsync();
        return Ok(new { saved = true });
    }

    private static PreferencesDto ToDto(UserPreference p) =>
        new(p.Theme, p.Units, p.DefaultDifficulty, p.Animations, p.ShowWorkoutTips);
}
