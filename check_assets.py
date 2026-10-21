import pyodbc

conn = pyodbc.connect('Server=localhost;Database=AlRobbanDb;Trusted_Connection=True;TrustServerCertificate=True;')
cur = conn.cursor()
cur.execute("SELECT Id, AccountCode, NameAr, NameEn, Category, IsPostable FROM gl.Accounts WHERE AccountCode LIKE '12%' OR AccountCode LIKE '53%' OR NameAr LIKE '%إهلاك%' OR NameAr LIKE '%أصول%' ORDER BY AccountCode")
for row in cur.fetchall():
    print(f'{row[0]} | {row[1]} | {row[2]} | {row[3]} | Category:{row[4]} | Postable:{row[5]}')
