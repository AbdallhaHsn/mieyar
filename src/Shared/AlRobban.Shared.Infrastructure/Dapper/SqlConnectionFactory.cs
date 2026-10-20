using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace AlRobban.Shared.Infrastructure.Dapper;

public interface ISqlConnectionFactory
{
    IDbConnection CreateConnection();
}

public class SqlConnectionFactory : ISqlConnectionFactory
{
    private readonly string _connectionString;
    private readonly bool _isPostgres;

    public SqlConnectionFactory(IConfiguration configuration)
    {
        var dbProvider = configuration["Database:Provider"] ?? "SqlServer";
        _isPostgres = dbProvider.Equals("PostgreSql", StringComparison.OrdinalIgnoreCase);

        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");
    }

    public IDbConnection CreateConnection()
    {
        if (_isPostgres)
        {
            var npgsqlConn = new NpgsqlConnection(_connectionString);
            npgsqlConn.Open();
            return npgsqlConn;
        }

        var sqlConn = new SqlConnection(_connectionString);
        sqlConn.Open();
        return sqlConn;
    }
}
