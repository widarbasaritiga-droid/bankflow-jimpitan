// Google Apps Script Backend untuk Sistem Jimpitan Digital
// Deploy sebagai Web App untuk mendapatkan API_URL

// Konfigurasi Spreadsheet
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
const SHEET_NAMES = {
  NASABAH: 'Nasabah',
  TRANSAKSI: 'Transaksi',
  SALDO: 'Saldo'
};

// Token keamanan (sesuaikan dengan di frontend)
const SECRET_TOKEN = 'JIMPITAN_DIGITAL_2024_SECRET_KEY';

// Inisialisasi
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

// Main request handler
function handleRequest(e) {
  try {
    const action = e.parameter.action;
    
    // Validasi token untuk aksi yang membutuhkan
    if (['addNasabah', 'addTransaksi', 'updateSaldo'].includes(action)) {
      const token = e.parameter.token || e.postData.contents ? JSON.parse(e.postData.contents).token : null;
      if (token !== SECRET_TOKEN) {
        return createResponse('error', 'Token tidak valid', null, 401);
      }
    }
    
    switch(action) {
      case 'getNasabah':
        return getNasabah();
      case 'addNasabah':
        return addNasabah(e);
      case 'getSaldo':
        return getSaldo(e.parameter.nama);
      case 'getAllSaldo':
        return getAllSaldo();
      case 'addTransaksi':
        return addTransaksi(e);
      case 'testConnection':
        return createResponse('success', 'API Connected', { version: '1.0.0' });
      default:
        return createResponse('error', 'Action tidak dikenali', null, 400);
    }
  } catch (error) {
    return createResponse('error', error.toString(), null, 500);
  }
}

// Helper: Create JSON response
function createResponse(status, message, data = null, httpCode = 200) {
  const output = ContentService.createTextOutput();
  output.setContent(JSON.stringify({
    status: status,
    message: message,
    data: data,
    timestamp: new Date().toISOString()
  }));
  output.setMimeType(ContentService.MimeType.JSON);
  output.setStatusCode(httpCode);
  return output;
}

// Helper: Get spreadsheet
function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// Get semua nasabah
function getNasabah() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.NASABAH);
    const data = sheet.getDataRange().getValues();
    
    // Skip header
    const nasabahList = data.slice(1).map(row => ({
      id_nasabah: row[0] || '',
      nama: row[1] || '',
      no_hp: row[2] || '',
      alamat: row[3] || '',
      email: row[4] || '',
      tanggal_daftar: row[5] ? new Date(row[5]).toISOString() : ''
    }));
    
    return createResponse('success', 'Data nasabah', nasabahList);
  } catch (error) {
    return createResponse('error', 'Gagal mengambil data nasabah: ' + error.toString());
  }
}

// Tambah nasabah baru
function addNasabah(e) {
  try {
    const data = e.postData ? JSON.parse(e.postData.contents) : e.parameter;
    
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.NASABAH);
    
    // Generate ID nasabah
    const lastRow = sheet.getLastRow();
    const idNasabah = 'NAS' + (String(lastRow).padStart(4, '0'));
    
    // Tambah data
    sheet.appendRow([
      idNasabah,
      data.nama,
      data.no_hp,
      data.alamat || '',
      data.email || '',
      new Date().toISOString()
    ]);
    
    return createResponse('success', 'Nasabah berhasil ditambahkan', { id_nasabah: idNasabah });
  } catch (error) {
    return createResponse('error', 'Gagal menambah nasabah: ' + error.toString());
  }
}

// Get saldo nasabah
function getSaldo(nama) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.SALDO);
    const data = sheet.getDataRange().getValues();
    
    // Cari nasabah
    const nasabahData = data.find(row => row[1] === nama);
    
    if (!nasabahData) {
      return createResponse('error', 'Nasabah tidak ditemukan', null, 404);
    }
    
    const saldo = {
      id_nasabah: nasabahData[0],
      nama: nasabahData[1],
      saldo_akhir: nasabahData[2] || 0,
      total_setor: nasabahData[3] || 0,
      total_tarik: nasabahData[4] || 0,
      last_update: nasabahData[5] || ''
    };
    
    return createResponse('success', 'Data saldo', saldo);
  } catch (error) {
    return createResponse('error', 'Gagal mengambil saldo: ' + error.toString());
  }
}

// Get semua saldo
function getAllSaldo() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.SALDO);
    const data = sheet.getDataRange().getValues();
    
    let totalSaldo = 0;
    
    // Hitung total saldo (skip header)
    data.slice(1).forEach(row => {
      totalSaldo += Number(row[2]) || 0;
    });
    
    return createResponse('success', 'Total saldo global', { 
      saldo_global: totalSaldo,
      jumlah_nasabah: data.length - 1
    });
  } catch (error) {
    return createResponse('error', 'Gagal menghitung saldo: ' + error.toString());
  }
}

// Tambah transaksi
function addTransaksi(e) {
  try {
    const data = e.postData ? JSON.parse(e.postData.contents) : e.parameter;
    
    const ss = getSpreadsheet();
    const transaksiSheet = ss.getSheetByName(SHEET_NAMES.TRANSAKSI);
    const saldoSheet = ss.getSheetByName(SHEET_NAMES.SALDO);
    
    // Generate ID transaksi
    const transaksiId = 'TRX' + Date.now();
    
    // Tambah ke sheet transaksi
    transaksiSheet.appendRow([
      transaksiId,
      data.nama,
      data.jenis,
      data.nominal,
      data.keterangan || '',
      new Date().toISOString()
    ]);
    
    // Update saldo nasabah
    const saldoData = saldoSheet.getDataRange().getValues();
    let nasabahFound = false;
    
    for (let i = 1; i < saldoData.length; i++) {
      if (saldoData[i][1] === data.nama) {
        nasabahFound = true;
        let currentSaldo = Number(saldoData[i][2]) || 0;
        let totalSetor = Number(saldoData[i][3]) || 0;
        let totalTarik = Number(saldoData[i][4]) || 0;
        
        if (data.jenis === 'SETOR') {
          currentSaldo += Number(data.nominal);
          totalSetor += Number(data.nominal);
        } else if (data.jenis === 'TARIK') {
          currentSaldo -= Number(data.nominal);
          totalTarik += Number(data.nominal);
        }
        
        // Update row
        saldoSheet.getRange(i + 1, 3).setValue(currentSaldo);
        saldoSheet.getRange(i + 1, 4).setValue(totalSetor);
        saldoSheet.getRange(i + 1, 5).setValue(totalTarik);
        saldoSheet.getRange(i + 1, 6).setValue(new Date().toISOString());
        
        break;
      }
    }
    
    // Jika nasabah belum ada di sheet saldo, buat baru
    if (!nasabahFound) {
      // Cari ID nasabah dari sheet nasabah
      const nasabahSheet = ss.getSheetByName(SHEET_NAMES.NASABAH);
      const nasabahData = nasabahSheet.getDataRange().getValues();
      let idNasabah = '';
      
      for (let i = 1; i < nasabahData.length; i++) {
        if (nasabahData[i][1] === data.nama) {
          idNasabah = nasabahData[i][0];
          break;
        }
      }
      
      let saldoAwal = 0;
      let totalSetor = 0;
      let totalTarik = 0;
      
      if (data.jenis === 'SETOR') {
        saldoAwal = Number(data.nominal);
        totalSetor = Number(data.nominal);
      } else if (data.jenis === 'TARIK') {
        saldoAwal = -Number(data.nominal);
        totalTarik = Number(data.nominal);
      }
      
      saldoSheet.appendRow([
        idNasabah || 'UNKNOWN',
        data.nama,
        saldoAwal,
        totalSetor,
        totalTarik,
        new Date().toISOString()
      ]);
    }
    
    return createResponse('success', 'Transaksi berhasil disimpan', { 
      transaksi_id: transaksiId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return createResponse('error', 'Gagal menyimpan transaksi: ' + error.toString());
  }
}
