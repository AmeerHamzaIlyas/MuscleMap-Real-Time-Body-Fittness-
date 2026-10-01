using Microsoft.EntityFrameworkCore;
using MuscleMap.Web.Models;

namespace MuscleMap.Web.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<UserPreference> Preferences => Set<UserPreference>();
    public DbSet<UserFavorite> Favorites => Set<UserFavorite>();
    public DbSet<UserCameraPoses> CameraPoses => Set<UserCameraPoses>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AppUser>(e =>
        {
            e.HasKey(u => u.Email);
            e.Property(u => u.Email).HasMaxLength(256);
            e.Property(u => u.Name).HasMaxLength(128);
        });

        modelBuilder.Entity<UserPreference>(e =>
        {
            e.HasKey(p => p.Email);
            e.HasOne(p => p.User)
                .WithOne(u => u.Preference)
                .HasForeignKey<UserPreference>(p => p.Email)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserFavorite>(e =>
        {
            e.HasKey(f => f.Id);
            e.HasIndex(f => new { f.UserEmail, f.Muscle, f.ExerciseName }).IsUnique();
            e.HasOne(f => f.User)
                .WithMany(u => u.Favorites)
                .HasForeignKey(f => f.UserEmail)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserCameraPoses>(e =>
        {
            e.HasKey(c => c.Email);
            e.HasOne(c => c.User)
                .WithOne(u => u.CameraPoses)
                .HasForeignKey<UserCameraPoses>(c => c.Email)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
