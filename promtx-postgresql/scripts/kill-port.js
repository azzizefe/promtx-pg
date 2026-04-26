import { execSync } from 'child_process';

const ports = [1420, 4173, 5432, 5433, 6379, 26379, 26380, 26381, 5050, 5555, 3001, 9090, 3000, 9187];

console.log('Portlar kontrol ediliyor ve temizleniyor...');

ports.forEach(port => {
    try {
        // Windows specific command to find PID
        const output = execSync(`netstat -ano | findstr :${port}`).toString();
        const lines = output.split('\n');
        const pids = new Set();

        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 5) {
                const pid = parts[parts.length - 1];
                if (pid && pid !== '0') {
                    pids.add(pid);
                }
            }
        });

        pids.forEach(pid => {
            console.log(`Port ${port} kullanan PID ${pid} sonlandiriliyor...`);
            try {
                execSync(`taskkill /F /PID ${pid}`);
            } catch (e) {
                // Ignore errors if process already died
            }
        });
    } catch (error) {
        // netstat returns exit code 1 if no matches found, ignore it
    }
});

console.log('Port temizleme islemi tamamlandi.');
