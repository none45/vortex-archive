# none's vortex archive

## How to download

You do **not** need to download any files. Simply open your terminal inside the folder where you want the file to be saved, and run the command below.

*Note: Change the version at the end of any command to fetch a different archived version.*<br>
*Replace noupdate with raw if you want the original version without the no-update wrapper.*

---

### Windows:
Open **PowerShell** and run the command for the version you want:

#### Client:
```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/none45/vortex-archive/main/assemble.ps1))) client v0.1.93 noupdate
```

#### Studio:
```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/none45/vortex-archive/main/assemble.ps1))) studio v0.1.1 noupdate
```

---

### Linux / Mac:
Open your **Terminal** and run the command for the version you want:

#### Client:
```bash
curl -sSL https://raw.githubusercontent.com/none45/vortex-archive/main/assemble.sh | bash -s -- client v0.1.93 noupdate
```

#### Studio:
```bash
curl -sSL https://raw.githubusercontent.com/none45/vortex-archive/main/assemble.sh | bash -s -- studio v0.1.1 noupdate
```

## List of current versions:

### Client
- v0.1.0
- v0.1.5
- v0.1.93
- v0.2.8
- v0.2.12
- v0.2.13
- v0.2.15
- v0.2.16
- v0.2.18
- v0.2.19
- v0.2.20
- v0.2.22
- v0.2.23
- v0.2.24
- v0.2.25
- v0.2.26
- v0.2.27

### Studio
- v0.1.0
- v0.1.1
- v0.1.2
- v0.1.3
- v0.2.0
- v0.2.1
