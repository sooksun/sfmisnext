INSERT INTO admin
    (name, username, email, password, password_default, del, code_login, avata, license, up_by, type, position, cre_date, sc_id)
VALUES
    ('ผู้ดูแลพิเศษ', 'admin_local', 'admin_local@sfmisystem.com', MD5('Admin@123'), 'Admin@123', 0, 'LOCALCODE', NULL, NULL, 1, 2, 2, NOW(), 1);

