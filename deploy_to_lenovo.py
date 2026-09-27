import paramiko
import os

hostname = "192.168.1.100"
username = "alecv"
password = "a2001714"
local_dir = r"C:\SISTEMAS DE INFORMACION 2\fashionstore-web\dist\fashionstore-web\browser"
remote_dir = "/var/www/fashionstore"

print("Conectando al servidor Lenovo...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(hostname, username=username, password=password)

print("Subiendo archivos por SFTP...")
sftp = ssh.open_sftp()

# We need to upload to a temp folder first since sftp can't natively sudo
temp_dir = "/tmp/fashionstore_dist"
ssh.exec_command(f'mkdir -p {temp_dir}')

for root, dirs, files in os.walk(local_dir):
    for file in files:
        local_path = os.path.join(root, file)
        rel_path = os.path.relpath(local_path, local_dir).replace('\\', '/')
        remote_path = f"{temp_dir}/{rel_path}"
        
        # Create directories if needed
        remote_file_dir = os.path.dirname(remote_path)
        ssh.exec_command(f'mkdir -p {remote_file_dir}')
        
        sftp.put(local_path, remote_path)
        print(f"Subido: {rel_path}")

sftp.close()

print("Moviendo archivos al directorio web con sudo...")
stdin, stdout, stderr = ssh.exec_command(f'echo {password} | sudo -S cp -r {temp_dir}/* {remote_dir}/')
stdout.read()
stdin, stdout, stderr = ssh.exec_command(f'echo {password} | sudo -S chown -R www-data:www-data {remote_dir}')
stdout.read()
stdin, stdout, stderr = ssh.exec_command(f'rm -rf {temp_dir}')
stdout.read()

print("Â¡Despliegue completado!")
ssh.close()
