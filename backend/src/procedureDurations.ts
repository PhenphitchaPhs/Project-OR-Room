export const PROCEDURE_DURATIONS: Record<string, number> = {
  'Laparoscopic Cholecystectomy / LC (ผ่าตัดนิ่วในถุงน้ำดี) - 120 mins': 120,
  'Herniorrhaphy (ผ่าตัดไส้เลื่อน) - 90 mins': 90,
  'Thyroid Lobectomy (ผ่าตัดต่อมไทรอยด์ออกหนึ่งข้าง) - 60 mins': 60,
  'Total Thyroidectomy (ผ่าตัดต่อมไทรอยด์ออกทั้งหมด) - 120 mins': 120,
  'Parathyroidectomy (ผ่าตัดต่อมพาราไทรอยด์) - 90 mins': 90,
  'Modified Radical Mastectomy / MRM (ผ่าตัดมะเร็งเต้านม) - 120 mins': 120,
  'WE SLNB (ผ่าตัดก้อนเต้านมแบบสงวนเต้า ร่วมกับเลาะต่อมน้ำเหลืองเซนติเนล) - 120 mins': 120,
  'SM SLNB (ผ่าตัดเต้านมออกทั้งเต้า ร่วมกับเลาะต่อมน้ำเหลืองเซนติเนล) - 120 mins': 120,
  'Colectomy (ผ่าตัดลำไส้ใหญ่) - 120 mins': 120,
  'LAR APR (ผ่าตัดมะเร็งลำไส้ตรง) - 180 mins': 180,
  'Hemorrhoidectomy (ผ่าตัดริดสีดวง) - 45 mins': 45,
  'Fistulotomy (ผ่าตัดเปิดฝีคัณฑสูตร) - 30 mins': 30,
  'Hepatectomy (ผ่าตัดตับ) - 180 mins': 180,
  'PPPD (ผ่าตัดตับอ่อนและลำไส้เล็กส่วนต้นแบบสงวนกระเพาะอาหาร) - 300 mins': 300,
  'Hilar Resection (ผ่าตัดมะเร็งท่อน้ำดีบริเวณขั้วตับ) - 300 mins': 300,
  'AVF (ผ่าตัดสร้างหลอดเลือดสำหรับฟอกไต) - 90 mins': 90,
  'Venous Ligation (ผ่าตัดผูกหลอดเลือดดำ) - 90 mins': 90,
  'Colonoscopy (ส่องกล้องตรวจลำไส้ใหญ่) - 60 mins': 60,
  'ERCP (ส่องกล้องตรวจรักษาท่อทางเดินน้ำดีและตับอ่อน) - 60 mins': 60,
  'Cesarean Section / C-Section (ผ่าคลอด) - 60 mins': 60,
  'Total Abdominal Hysterectomy / TAH (ผ่าตัดมดลูก) - 120 mins': 120,
  'Tubal Resection / TR (ทำหมันหญิง) - 30 mins': 30,
  'Total Knee Arthroplasty / TKA (ผ่าตัดเปลี่ยนผิวข้อเข่า) - 180 mins': 180,
  'Total Hip Arthroplasty / THA (ผ่าตัดเปลี่ยนข้อสะโพก) - 180 mins': 180,
  'ORIF (ผ่าตัดใส่เหล็กดามกระดูกหัก) - 120 mins': 120,
  'Cataract Surgery (ผ่าตัดต้อกระจก) - 30 mins': 30,
  'TURP (ผ่าตัดส่องกล้องต่อมลูกหมาก) - 90 mins': 90,
  'Tonsillectomy (ผ่าตัดทอนซิล) - 45 mins': 45,
}

export const getProcedureDuration = (procedure: unknown): number => {
  if (typeof procedure !== 'string' || !procedure.trim()) {
    throw new Error('procedure is required')
  }

  const duration = PROCEDURE_DURATIONS[procedure]
  if (duration === undefined) {
    throw new Error(`Unsupported procedure: ${procedure}`)
  }

  return duration
}
