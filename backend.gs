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
    // Parse parameter dari POST atau GET
    let params = {};
    if (e.postData && e.postData.contents) {
      try {
        params = JSON.parse(e.postData.contents);
      } catch (parseError) {
        // Jika bukan JSON, gunakan parameter biasa
        params = e.parameter || {};
      }
    } else {
      params = e.parameter || {};
    }
    
    const action = params.action || e.parameter?.action;
    
    console.log('📥 Request received:', { action, params });
    
    // Validasi token untuk aksi yang membutuhkan
    if (['addNasabah', 'addTransaksi', 'updateSaldo'].includes(action)) {
      const token = params.token || e.parameter?.token;
      if (token !== SECRET_TOKEN) {
        return createResponse('error', 'Token tidak valid', null, 401);
      }
    }
    
    switch(action) {
      case 'getNasabah':
        return getNasabah();
      case 'addNasabah':
        return addNasabah(params);
      case 'getSaldo':
        return getSaldo(params.nama || e.parameter?.nama);
      case 'getAllSaldo':
        return getAllSaldo();
      case 'addTransaksi':
        return addTransaksi(params);
      case 'testConnection':
        return createResponse('success', 'API Connected', { version: '1.0.1', timestamp: new Date().toISOString() });
      default:
        return createResponse('error', 'Action tidak dikenali: ' + action, null, 400);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    return createResponse('error', error.toString(), null, 500);
  }
}

// Helper: Create JSON response
function createResponse(status, message, data = null, httpCode = 200) {
  const output = ContentService.createTextOutput();
  const response = {
    status: status,
    message: message,
    data: data,
    timestamp: new Date().toISOString()
  };
  output.setContent(JSON.stringify(response));
  output.setMimeType(ContentService.MimeType.JSON);
  output.setStatusCode(httpCode);
  return output;
}

// Helper: Get spreadsheet
function getSpreadsheet() {
  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (error) {
    console.error('❌ Gagal membuka spreadsheet:', error);
    throw new Error('Spreadsheet tidak ditemukan. Periksa SPREADSHEET_ID');
  }
}

// Get semua nasabah dengan jumlah harian
function getNasabah() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.NASABAH);
    const data = sheet.getDataRange().getValues();
    
    console.log('📊 Data nasabah:', data.length, 'rows');
    
    // Skip header
    const nasabahList = data.slice(1)
      .filter(row => row[0] && row[0].toString().trim() !== '') // Filter ID kosong
      .map(row => ({
        id_nasabah: row[0] ? row[0].toString() : '',
        nama: row[1] ? row[1].toString() : '',
        jumlah_harian: row[2] ? parseInt(row[2]) || 0 : 0 // Kolom JUMLAH HARIAN (kolom C)
      }));
    
    console.log('✅ Nasabah loaded:', nasabahList.length);
    
    return createResponse('success', 'Data nasabah berhasil dimuat', nasabahList);
  } catch (error) {
    console.error('❌ Error getNasabah:', error);
    return createResponse('error', 'Gagal mengambil data nasabah: ' + error.toString());
  }
}

// Tambah nasabah baru
function addNasabah(params) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.NASABAH);
    
    // Validasi data
    if (!params.nama || params.nama.trim() === '') {
      return createResponse('error', 'Nama nasabah wajib diisi', null, 400);
    }
    
    // Generate ID nasabah
    const lastRow = sheet.getLastRow();
    const idNasabah = 'NAS' + String(lastRow + 1).padStart(4, '0');
    
    // Tambah data (hanya ID, Nama, dan Jumlah Harian)
    sheet.appendRow([
      idNasabah,
      params.nama.trim(),
      params.jumlah_harian || 0 // JUMLAH HARIAN default 0
    ]);
    
    return createResponse('success', 'Nasabah berhasil ditambahkan', { id_nasabah: idNasabah });
  } catch (error) {
    console.error('❌ Error addNasabah:', error);
    return createResponse('error', 'Gagal menambah nasabah: ' + error.toString());
  }
}

// Get saldo nasabah
function getSaldo(nama) {
  try {
    if (!nama) {
      return createResponse('error', 'Nama nasabah wajib diisi', null, 400);
    }
    
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.SALDO);
    const data = sheet.getDataRange().getValues();
    
    // Cari nasabah
    const nasabahData = data.find(row => row[1] === nama);
    
    if (!nasabahData) {
      return createResponse('error', 'Nasabah tidak ditemukan', null, 404);
    }
    
    const saldo = {
      id_nasabah: nasabahData[0] || '',
      nama: nasabahData[1] || '',
      saldo_akhir: Number(nasabahData[2]) || 0,
      total_setor: Number(nasabahData[3]) || 0,
      total_tarik: Number(nasabahData[4]) || 0,
      last_update: nasabahData[5] || ''
    };
    
    return createResponse('success', 'Data saldo', saldo);
  } catch (error) {
    console.error('❌ Error getSaldo:', error);
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
    let activeNasabah = 0;
    
    // Hitung total saldo (skip header)
    data.slice(1).forEach(row => {
      if (row[1] && row[1].toString().trim() !== '') {
        totalSaldo += Number(row[2]) || 0;
        activeNasabah++;
      }
    });
    
    return createResponse('success', 'Total saldo global', { 
      saldo_global: totalSaldo,
      jumlah_nasabah: activeNasabah
    });
  } catch (error) {
    console.error('❌ Error getAllSaldo:', error);
    return createResponse('error', 'Gagal menghitung saldo: ' + error.toString());
  }
}

// Tambah transaksi dengan perhitungan jimpitan harian
function addTransaksi(params) {
  try {
    const ss = getSpreadsheet();
    const transaksiSheet = ss.getSheetByName(SHEET_NAMES.TRANSAKSI);
    const saldoSheet = ss.getSheetByName(SHEET_NAMES.SALDO);
    const nasabahSheet = ss.getSheetByName(SHEET_NAMES.NASABAH);
    
    // Validasi data
    if (!params.nama) {
      return createResponse('error', 'Nama nasabah wajib diisi', null, 400);
    }
    
    if (!params.nominal || isNaN(params.nominal) || params.nominal <= 0) {
      return createResponse('error', 'Nominal transaksi tidak valid', null, 400);
    }
    
    // Generate ID transaksi
    const transaksiId = 'TRX' + Date.now();
    
    // Tambah ke sheet transaksi
    transaksiSheet.appendRow([
      transaksiId,
      params.nama,
      params.jenis || 'SETOR',
      Number(params.nominal),
      params.keterangan || '',
      new Date().toISOString()
    ]);
    
    // Update saldo nasabah
    const saldoData = saldoSheet.getDataRange().getValues();
    let nasabahFound = false;
    const nominal = Number(params.nominal);
    const jenis = params.jenis || 'SETOR';
    
    for (let i = 1; i < saldoData.length; i++) {
      if (saldoData[i][1] === params.nama) {
        nasabahFound = true;
        let currentSaldo = Number(saldoData[i][2]) || 0;
        let totalSetor = Number(saldoData[i][3]) || 0;
        let totalTarik = Number(saldoData[i][4]) || 0;
        
        if (jenis === 'SETOR') {
          currentSaldo += nominal;
          totalSetor += nominal;
        } else if (jenis === 'TARIK') {
          if (currentSaldo < nominal) {
            return createResponse('error', 'Saldo tidak mencukupi', null, 400);
          }
          currentSaldo -= nominal;
          totalTarik += nominal;
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
      const nasabahData = nasabahSheet.getDataRange().getValues();
      let idNasabah = '';
      
      for (let i = 1; i < nasabahData.length; i++) {
        if (nasabahData[i][1] === params.nama) {
          idNasabah = nasabahData[i][0] || '';
          break;
        }
      }
      
      let saldoAwal = 0;
      let totalSetor = 0;
      let totalTarik = 0;
      
      if (jenis === 'SETOR') {
        saldoAwal = nominal;
        totalSetor = nominal;
      } else if (jenis === 'TARIK') {
        if (nominal > 0) {
          // Untuk tarik, saldo awal negatif (hutang)
          saldoAwal = -nominal;
          totalTarik = nominal;
        }
      }
      
      saldoSheet.appendRow([
        idNasabah || 'UNKNOWN',
        params.nama,
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
    console.error('❌ Error addTransaksi:', error);
    return createResponse('error', 'Gagal menyimpan transaksi: ' + error.toString());
  }
}
