<template>
    <div class="doctor-section" style="margin-bottom: 20px;">
        <div class="section-header">
            <h2 class="section-title">📅 สถิติปีงบประมาณ {{ fiscalYearLabel }}</h2>
        </div>

        <div class="fiscal-summary-row">
            <div class="fiscal-summary-card">
                <span class="formal-stat-icon-badge green">
                    <span class="material-icons">task_alt</span>
                </span>
                <div>
                    <div class="fiscal-summary-number">{{ fiscalYearTotal }}</div>
                    <div class="fiscal-summary-label">
                        เคสที่เสร็จสิ้นทั้งหมด · {{ fiscalYearRangeLabel }}
                    </div>
                </div>
            </div>
        </div>

        <!-- ===== แผนภูมิแท่ง + เส้นกราฟแนวโน้ม รายเดือน ===== -->
        <div class="fiscal-chart-wrap">
            <div class="chart-legend">
                <span class="legend-item"><span class="legend-dot bar-dot"></span> จำนวนเคส (แท่ง)</span>
                <span class="legend-item"><span class="legend-dot line-dot"></span> แนวโน้ม (เส้น)</span>
            </div>

            <svg :viewBox="`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`" class="bar-chart-svg"
                preserveAspectRatio="xMidYMid meet">
                <!-- เส้นกริดแนวนอน -->
                <line v-for="g in gridLines" :key="g" :x1="CHART_PADDING" :x2="CHART_WIDTH - CHART_PADDING" :y1="g"
                    :y2="g" class="chart-grid-line" />

                <!-- เส้นฐาน -->
                <line :x1="CHART_PADDING" :x2="CHART_WIDTH - CHART_PADDING" :y1="CHART_HEIGHT - CHART_PADDING"
                    :y2="CHART_HEIGHT - CHART_PADDING" class="chart-axis-line" />

                <!-- แท่งกราฟ -->
                <g v-for="d in barChartData" :key="'bar-' + d.key">
                    <rect :x="d.x" :y="d.y" :width="d.barWidth" :height="d.barHeight" rx="4" class="chart-bar">
                        <title>{{ d.label }} — {{ d.count }} เคส</title>
                    </rect>
                    <text v-if="d.count > 0" :x="d.cx" :y="d.y - 6" text-anchor="middle" class="chart-value-label">
                        {{ d.count }}
                    </text>
                    <text :x="d.cx" :y="CHART_HEIGHT - CHART_PADDING + 16" text-anchor="middle"
                        class="chart-month-label">
                        {{ shortMonthLabel(d.label) }}
                    </text>
                </g>

                <!-- เส้นแนวโน้ม -->
                <polyline :points="linePoints" class="chart-trend-line" />
                <circle v-for="d in barChartData" :key="'pt-' + d.key" :cx="d.cx" :cy="d.cy" r="3.2"
                    class="chart-trend-point">
                    <title>{{ d.label }} — {{ d.count }} เคส</title>
                </circle>
            </svg>
        </div>

        <!-- ===== สถิติการใช้ห้องผ่าตัดรายปี ===== -->
        <div class="room-usage-section">
            <div class="room-usage-header">
                <span class="material-icons room-usage-icon">meeting_room</span>
                <h3 class="room-usage-title">สถิติการใช้ห้องผ่าตัดรายปี</h3>
            </div>

            <div v-if="roomMonthlyUsage.length === 0" class="room-usage-empty">
                ไม่มีข้อมูลการใช้ห้องผ่าตัดในปีงบประมาณนี้
            </div>

            <div v-else class="room-usage-table-wrap">
                <table class="room-usage-table">
                    <thead>
                        <tr>
                            <th class="room-col">ห้อง</th>
                            <th v-for="m in shortMonthLabels" :key="m">{{ m }}</th>
                            <th class="total-col">รวม</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in roomMonthlyUsage" :key="row.room">
                            <td class="room-col room-name-cell">{{ row.room }}</td>
                            <td v-for="(m, idx) in row.months" :key="idx" :class="{ 'has-case': m.count > 0 }"
                                :title="m.count > 0 ? `${m.count} เคส · ${m.minutes} นาที` : ''">
                                {{ m.count > 0 ? m.count : '·' }}
                            </td>
                            <td class="total-col total-cell">{{ row.total }}</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr>
                            <td class="room-col room-name-cell">รวมทุกห้อง</td>
                            <td v-for="(v, idx) in monthlyTotalsAcrossRooms" :key="idx" class="footer-cell">
                                {{ v > 0 ? v : '·' }}
                            </td>
                            <td class="total-col total-cell">{{ fiscalYearTotal }}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    </div>
    <div class="monthly-room-section">

        <div class="monthly-room-header">

            <div class="monthly-room-header-left">
                <div class="monthly-room-icon">
                    <span class="material-icons">meeting_room</span>
                </div>

                <div>
                    <h3 class="monthly-room-title">
                        สถิติการใช้ห้องผ่าตัดรายเดือน
                    </h3>

                    <p class="monthly-room-subtitle">
                        จำนวนเคสและระยะเวลาการใช้ห้องผ่าตัดแยกตามเดือน
                    </p>
                </div>
            </div>

            <!-- Dropdown เดือน -->
            <div class="monthly-room-filter">
                <label>เดือน</label>

                <select v-model="selectedMonthlyRoomMonth">
                    <option v-for="month in monthlyRoomMonthOptions" :key="month.value" :value="month.value">
                        {{ month.label }}
                    </option>
                </select>
            </div>

        </div>


        <!-- Summary -->
        <div class="monthly-room-summary">

            <div class="monthly-summary-card">

                <div class="monthly-summary-icon blue">
                    <span class="material-icons">
                        meeting_room
                    </span>
                </div>

                <div>
                    <div class="monthly-summary-number">
                        20
                    </div>

                    <div class="monthly-summary-label">
                        ห้องผ่าตัดทั้งหมด
                    </div>
                </div>

            </div>


            <div class="monthly-summary-card">

                <div class="monthly-summary-icon green">
                    <span class="material-icons">
                        task_alt
                    </span>
                </div>

                <div>
                    <div class="monthly-summary-number">
                        {{ selectedMonthlyTotalCases }}
                    </div>

                    <div class="monthly-summary-label">
                        เคสที่เสร็จสิ้น · {{ selectedMonthlyRoomMonthLabel }}
                    </div>
                </div>

            </div>


            <div class="monthly-summary-card">

                <div class="monthly-summary-icon orange">
                    <span class="material-icons">
                        schedule
                    </span>
                </div>

                <div>
                    <div class="monthly-summary-number">
                        {{ selectedMonthlyTotalMinutes.toLocaleString() }}
                    </div>

                    <div class="monthly-summary-label">
                        นาทีการใช้งาน
                    </div>
                </div>

            </div>

        </div>


        <!-- ตาราง -->
        <div class="monthly-room-table-wrap">

            <table class="monthly-room-table">

                <thead>
                    <tr>
                        <th>ห้อง</th>
                        <th>จำนวนเคส</th>
                        <th>นาทีใช้งาน</th>
                        <th>สถานะ</th>
                    </tr>
                </thead>

                <tbody>

                    <tr v-for="row in monthlyRoomUsage" :key="row.room">

                        <td class="monthly-room-name">
                            {{ row.room }}
                        </td>

                        <td :class="{
                            'monthly-has-case': row.count > 0
                        }">
                            {{ row.count > 0 ? row.count : '·' }}
                        </td>

                        <td>
                            {{
                                row.minutes > 0
                                    ? row.minutes.toLocaleString()
                                    : '·'
                            }}
                        </td>

                        <td>

                            <span v-if="row.count > 0" class="monthly-status active">
                                <span class="status-dot"></span>
                                มีการใช้งาน
                            </span>

                            <span v-else class="monthly-status empty">
                                <span class="status-dot"></span>
                                ไม่มีเคส
                            </span>

                        </td>

                    </tr>

                </tbody>


                <tfoot>
                    <tr>

                        <td>
                            รวมทุกห้อง
                        </td>

                        <td>
                            {{ selectedMonthlyTotalCases }}
                        </td>

                        <td>
                            {{ selectedMonthlyTotalMinutes.toLocaleString() }}
                        </td>

                        <td>
                            -
                        </td>

                    </tr>
                </tfoot>

            </table>

        </div>

    </div>

</template>

<script setup>
import { computed, ref, watch } from 'vue'

// รับ bookings มาจาก parent เฉยๆ ไม่ต้อง fetch เอง
const props = defineProps({
    bookings: {
        type: Array,
        default: () => []
    }
})

// 📅 ปีงบประมาณไทย: 1 ต.ค. - 30 ก.ย. ปีถัดไป — คำนวณจากวันที่ปัจจุบันเสมอ
const THAI_MONTHS_FISCAL_ORDER = [
    'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม',
    'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน'
]

const THAI_MONTHS_SHORT = [
    'ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.',
    'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.'
]

const shortMonthLabels = THAI_MONTHS_SHORT
const shortMonthLabel = (label) => {
    const idx = THAI_MONTHS_FISCAL_ORDER.indexOf(label)
    return idx === -1 ? label : THAI_MONTHS_SHORT[idx]
}

const fiscalYearInfo = computed(() => {
    const now = new Date()
    const month = now.getMonth() // 0 = ม.ค., 9 = ต.ค.
    const year = now.getFullYear()

    const startYear = month >= 9 ? year : year - 1
    const endYear = startYear + 1

    const start = new Date(startYear, 9, 1) // 1 ต.ค.
    const end = new Date(endYear, 8, 30, 23, 59, 59) // 30 ก.ย.

    const label = String(endYear + 543)

    return { start, end, startYear, endYear, label }
})

const fiscalYearLabel = computed(() => fiscalYearInfo.value.label)

const fiscalYearRangeLabel = computed(() => {
    const { start, end } = fiscalYearInfo.value
    const fmt = (d) => `${d.getDate()} ${THAI_MONTHS_FISCAL_ORDER[(d.getMonth() + 3) % 12]} ${d.getFullYear() + 543}`
    return `${fmt(start)} – ${fmt(end)}`
})

// เคสที่เสร็จสิ้น (Completed) ในปีงบประมาณปัจจุบันเท่านั้น
const fiscalYearBookings = computed(() => {
    const { start, end } = fiscalYearInfo.value
    return props.bookings.filter(b => {
        if (b.status !== 'Completed' || !b.date) return false
        const d = new Date(b.date)
        return d >= start && d <= end
    })
})

const fiscalYearTotal = computed(() => fiscalYearBookings.value.length)

// รายเดือน ต.ค. → ก.ย. พร้อมสัดส่วนสำหรับทำแท่งกราฟ
const fiscalMonthlyBreakdown = computed(() => {
    const { startYear } = fiscalYearInfo.value
    const counts = THAI_MONTHS_FISCAL_ORDER.map((label, idx) => {
        const realMonth = (9 + idx) % 12
        const realYear = idx <= 2 ? startYear : startYear + 1
        const count = fiscalYearBookings.value.filter(b => {
            const d = new Date(b.date)
            return d.getMonth() === realMonth && d.getFullYear() === realYear
        }).length
        return { key: `${realYear}-${realMonth}`, label, count }
    })

    const max = Math.max(1, ...counts.map(c => c.count))
    return counts.map(c => ({ ...c, percent: Math.round((c.count / max) * 100) }))
})

// ===================== SVG Bar + Line Chart =====================
const CHART_WIDTH = 640
const CHART_HEIGHT = 220
const CHART_PADDING = 32

const barChartData = computed(() => {
    const data = fiscalMonthlyBreakdown.value
    const n = data.length || 1
    const innerWidth = CHART_WIDTH - CHART_PADDING * 2
    const innerHeight = CHART_HEIGHT - CHART_PADDING * 2
    const step = innerWidth / n
    const barWidth = step * 0.5
    const maxCount = Math.max(1, ...data.map(d => d.count))

    return data.map((d, i) => {
        const barHeight = maxCount > 0 ? (d.count / maxCount) * innerHeight : 0
        const x = CHART_PADDING + step * i + (step - barWidth) / 2
        const y = CHART_HEIGHT - CHART_PADDING - barHeight
        return {
            ...d,
            x,
            y,
            barWidth,
            barHeight,
            cx: x + barWidth / 2,
            cy: y
        }
    })
})

const linePoints = computed(() =>
    barChartData.value.map(d => `${d.cx},${d.cy}`).join(' ')
)

// เส้นกริดแนวนอน 4 เส้นแบ่งพื้นที่กราฟเท่าๆ กัน ไว้ช่วยกะสัดส่วนด้วยสายตา
const gridLines = computed(() => {
    const innerHeight = CHART_HEIGHT - CHART_PADDING * 2
    const lines = []
    for (let i = 1; i <= 3; i++) {
        lines.push(CHART_PADDING + (innerHeight / 4) * i)
    }
    return lines
})

// ===================== สถิติการใช้ห้องผ่าตัดรายเดือน =====================
const roomKeyOf = (b) => {
    const match = String(b.room || '').match(/(\d+)/)
    return match ? `OR-${match[1]}` : (b.room || 'ไม่ระบุห้อง')
}

const minutesOf = (b) => {
    const match = b.procedure?.match(/(\d+)\s*min/)
    return match ? parseInt(match[1]) : 0
}

const roomMonthlyUsage = computed(() => {
    const { startYear } = fiscalYearInfo.value
    const roomsMap = {}

    fiscalYearBookings.value.forEach(b => {
        const room = roomKeyOf(b)
        if (!roomsMap[room]) {
            roomsMap[room] = THAI_MONTHS_FISCAL_ORDER.map(() => ({ count: 0, minutes: 0 }))
        }

        const d = new Date(b.date)
        // แปลงเดือนจริง (0=ม.ค.) ให้เป็น index ตามลำดับปีงบประมาณ (0=ต.ค.)
        const fiscalIdx = (d.getMonth() - 9 + 12) % 12

        roomsMap[room][fiscalIdx].count += 1
        roomsMap[room][fiscalIdx].minutes += minutesOf(b)
    })

    return Object.entries(roomsMap)
        .map(([room, months]) => ({
            room,
            months,
            total: months.reduce((sum, m) => sum + m.count, 0)
        }))
        .sort((a, b) => a.room.localeCompare(b.room, undefined, { numeric: true }))
})

// แถวรวมท้ายตาราง — รวมจำนวนเคสของทุกห้องในแต่ละเดือน
const monthlyTotalsAcrossRooms = computed(() => {
    const totals = new Array(12).fill(0)
    roomMonthlyUsage.value.forEach(row => {
        row.months.forEach((m, idx) => { totals[idx] += m.count })
    })
    return totals
})

// ======================================================
// สถิติการใช้ห้องผ่าตัดรายเดือน
// ======================================================

// ห้องคงที่ 20 ห้อง
const FIXED_OR_ROOMS = Array.from(
    { length: 20 },
    (_, index) => `OR-${201 + index}`
)


const MONTHLY_ROOM_MONTH_KEY = 'monthlyRoomSelectedMonth'

const getSavedMonthlyRoomMonth = () => {
    const saved = localStorage.getItem(MONTHLY_ROOM_MONTH_KEY)

    if (saved !== null) {
        return saved
    }

    // ถ้ายังไม่เคยเลือก ให้ใช้เดือนปัจจุบัน
    const now = new Date()

    return `${now.getFullYear()}-${now.getMonth()}`
}

const selectedMonthlyRoomMonth = ref(
    getSavedMonthlyRoomMonth()
)
watch(
    selectedMonthlyRoomMonth,
    (newValue) => {
        localStorage.setItem(
            MONTHLY_ROOM_MONTH_KEY,
            newValue
        )
    }
)


// ตัวเลือกเดือน
const monthlyRoomMonthOptions = computed(() => {
    const year = new Date().getFullYear()

    return THAI_MONTHS_FISCAL_ORDER.map((month, index) => {

        const realMonth = (9 + index) % 12
        const realYear = index <= 2
            ? year - 1
            : year

        return {
            value: `${realYear}-${realMonth}`,
            label: `${month} ${realYear + 543}`
        }
    })
})


// Label เดือนที่เลือก
const selectedMonthlyRoomMonthLabel = computed(() => {

    return monthlyRoomMonthOptions.value.find(
        item => item.value === selectedMonthlyRoomMonth.value
    )?.label || ''
})


// ======================================================
// Booking ของเดือนที่เลือก
// ======================================================

const selectedMonthlyRoomBookings = computed(() => {

    const selected = String(
        selectedMonthlyRoomMonth.value
    )

    return props.bookings.filter(b => {

        if (
            b.status !== 'Completed' ||
            !b.date
        ) {
            return false
        }

        const d = new Date(b.date)

        const key =
            `${d.getFullYear()}-${d.getMonth()}`

        return key === selected
    })
})


// ======================================================
// แปลงชื่อห้อง
// ======================================================

const fixedRoomKeyOf = (b) => {

    const match = String(
        b.room || ''
    ).match(/(\d+)/)

    if (!match) return null

    const number = parseInt(match[1])

    if (
        number < 201 ||
        number > 220
    ) {
        return null
    }

    return `OR-${number}`
}


// ======================================================
// จำนวนเวลาผ่าตัด
// ======================================================

const roomMinutesOf = (b) => {

    const match = String(
        b.procedure || ''
    ).match(/(\d+)\s*min/i)

    return match
        ? parseInt(match[1])
        : 0
}


// ======================================================
// สร้างข้อมูลครบ 20 ห้อง
// ======================================================

const monthlyRoomUsage = computed(() => {

    // สร้างครบ OR-201 → OR-220 ก่อน
    const rooms = {}

    FIXED_OR_ROOMS.forEach(room => {

        rooms[room] = {
            room,
            count: 0,
            minutes: 0
        }

    })


    // เอา booking มาใส่แต่ละห้อง
    selectedMonthlyRoomBookings.value.forEach(b => {

        const room = fixedRoomKeyOf(b)

        if (!room || !rooms[room]) {
            return
        }

        rooms[room].count += 1

        rooms[room].minutes += roomMinutesOf(b)

    })


    // คืนค่าตามลำดับ OR-201 → OR-220
    return FIXED_OR_ROOMS.map(
        room => rooms[room]
    )
})


// ======================================================
// รวมจำนวนเคส
// ======================================================

const selectedMonthlyTotalCases = computed(() => {

    return monthlyRoomUsage.value.reduce(
        (sum, row) => sum + row.count,
        0
    )
})


// ======================================================
// รวมเวลาการใช้งาน
// ======================================================

const selectedMonthlyTotalMinutes = computed(() => {

    return monthlyRoomUsage.value.reduce(
        (sum, row) => sum + row.minutes,
        0
    )
})
</script>

<style scoped>
.doctor-section {
    background: white;
    border-radius: 20px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
    overflow: hidden;
}

.section-header {
    background: #1a3a5f;
    padding: 16px 20px;
}

.section-title {
    color: white;
    font-size: 1rem;
    font-weight: 700;
    margin: 0;
}

.fiscal-summary-row {
    padding: 16px 20px 4px;
}

.fiscal-summary-card {
    display: flex;
    align-items: center;
    gap: 14px;
    background: #f9fbff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 14px 16px;
}

.formal-stat-icon-badge {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.formal-stat-icon-badge .material-icons {
    font-size: 18px;
}

.formal-stat-icon-badge.green {
    background: #dcfce7;
    color: #15803d;
}

.fiscal-summary-number {
    font-size: 1.8rem;
    font-weight: 800;
    color: #1a3a5f;
    line-height: 1;
}

.fiscal-summary-label {
    font-size: 12px;
    color: #64748b;
    margin-top: 4px;
}

/* ===== Chart ===== */
.fiscal-chart-wrap {
    padding: 16px 20px 8px;
}

.chart-legend {
    display: flex;
    gap: 16px;
    margin-bottom: 8px;
}

.legend-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #64748b;
    font-weight: 600;
}

.legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    display: inline-block;
}

.legend-dot.bar-dot {
    background: linear-gradient(180deg, #4a6fa5, #1a3a5f);
    border-radius: 3px;
}

.legend-dot.line-dot {
    background: #f59e0b;
    border-radius: 50%;
}

.bar-chart-svg {
    width: 100%;
    height: auto;
    display: block;
}

.chart-grid-line {
    stroke: #eef2f7;
    stroke-width: 1;
}

.chart-axis-line {
    stroke: #cbd5e1;
    stroke-width: 1.5;
}

.chart-bar {
    fill: #4a6fa5;
    transition: fill 0.2s;
}

.chart-bar:hover {
    fill: #1a3a5f;
}

.chart-value-label {
    font-size: 11px;
    font-weight: 700;
    fill: #1a3a5f;
}

.chart-month-label {
    font-size: 10px;
    fill: #64748b;
    font-weight: 600;
}

.chart-trend-line {
    fill: none;
    stroke: #f59e0b;
    stroke-width: 2;
    stroke-linejoin: round;
    stroke-linecap: round;
}

.chart-trend-point {
    fill: #f59e0b;
    stroke: white;
    stroke-width: 1.5;
}

/* ===== Room Usage Table ===== */
.room-usage-section {
    padding: 12px 20px 20px;
}

.room-usage-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    padding-top: 8px;
    border-top: 1px solid #eef2f7;
}

.room-usage-icon {
    color: #4a6fa5;
    font-size: 20px;
}

.room-usage-title {
    font-size: 14px;
    font-weight: 700;
    color: #1a3a5f;
    margin: 0;
}

.room-usage-empty {
    text-align: center;
    color: #94a3b8;
    font-size: 13px;
    padding: 20px 0;
}

.room-usage-table-wrap {
    overflow-x: auto;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
}

.room-usage-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    min-width: 560px;
}

.room-usage-table th {
    background: #eef2f7;
    color: #1a3a5f;
    font-weight: 700;
    padding: 8px 6px;
    text-align: center;
    white-space: nowrap;
}

.room-usage-table td {
    padding: 7px 6px;
    text-align: center;
    color: #475569;
    border-bottom: 1px solid #f1f5f9;
}

.room-usage-table tbody tr:hover {
    background: #f9fbff;
}

.room-usage-table td.has-case {
    color: #1a3a5f;
    font-weight: 700;
}

.room-col {
    text-align: left !important;
    padding-left: 12px !important;
    white-space: nowrap;
}

.room-name-cell {
    font-weight: 700;
    color: #1a3a5f;
}

.total-col {
    background: #f9fbff;
}

.total-cell {
    font-weight: 800;
    color: #1a3a5f;
}

.room-usage-table tfoot td {
    border-top: 2px solid #e2e8f0;
    border-bottom: none;
    background: #f5f7fa;
}

.footer-cell {
    font-weight: 700;
    color: #334155;
}

/* ======================================================
   Monthly Room Usage Card
====================================================== */

.monthly-room-section {
    margin: 20px;

    border: 1px solid #e2e8f0;
    border-radius: 14px;

    overflow: hidden;

    background: #ffffff;
}


/* Header */

.monthly-room-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 20px;

    padding: 16px 18px;

    background: #f8fafc;

    border-bottom: 1px solid #e2e8f0;
}


.monthly-room-header-left {
    display: flex;
    align-items: center;

    gap: 10px;
}


.monthly-room-icon {
    width: 36px;
    height: 36px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 9px;

    background: #e0ecff;
    color: #2563eb;
}


.monthly-room-icon .material-icons {
    font-size: 20px;
}


.monthly-room-title {
    margin: 0;

    color: #1a3a5f;

    font-size: 14px;
    font-weight: 700;
}


.monthly-room-subtitle {
    margin: 3px 0 0;

    color: #94a3b8;

    font-size: 11px;
}


/* Dropdown */

.monthly-room-filter {
    display: flex;
    align-items: center;

    gap: 8px;
}


.monthly-room-filter label {
    color: #64748b;

    font-size: 11px;
    font-weight: 600;
}


.monthly-room-filter select {
    min-width: 150px;

    padding: 8px 12px;

    border: 1px solid #cbd5e1;
    border-radius: 8px;

    background: white;

    color: #1a3a5f;

    font-size: 12px;
    font-weight: 600;

    outline: none;

    cursor: pointer;
}


.monthly-room-filter select:focus {
    border-color: #4a6fa5;

    box-shadow:
        0 0 0 3px rgba(74, 111, 165, 0.1);
}


/* Summary */

.monthly-room-summary {
    display: grid;

    grid-template-columns:
        repeat(3, 1fr);

    gap: 12px;

    padding: 14px 18px;
}


.monthly-summary-card {
    display: flex;
    align-items: center;

    gap: 12px;

    padding: 12px 14px;

    border: 1px solid #e2e8f0;

    border-radius: 10px;

    background: #f9fbff;
}


.monthly-summary-icon {
    width: 34px;
    height: 34px;

    display: flex;
    align-items: center;
    justify-content: center;

    flex-shrink: 0;

    border-radius: 9px;
}


.monthly-summary-icon .material-icons {
    font-size: 18px;
}


.monthly-summary-icon.blue {
    background: #e0ecff;
    color: #2563eb;
}


.monthly-summary-icon.green {
    background: #dcfce7;
    color: #15803d;
}


.monthly-summary-icon.orange {
    background: #fef3c7;
    color: #d97706;
}


.monthly-summary-number {
    color: #1a3a5f;

    font-size: 1.45rem;
    font-weight: 800;

    line-height: 1;
}


.monthly-summary-label {
    margin-top: 4px;

    color: #64748b;

    font-size: 11px;
}


/* Table */

.monthly-room-table-wrap {
    margin: 0 18px 18px;

    overflow-x: auto;

    border: 1px solid #e2e8f0;

    border-radius: 10px;
}


.monthly-room-table {
    width: 100%;

    border-collapse: collapse;

    font-size: 12px;
}


.monthly-room-table th {
    padding: 9px 10px;

    background: #eef2f7;

    color: #1a3a5f;

    font-weight: 700;

    text-align: center;

    white-space: nowrap;
}


.monthly-room-table td {
    padding: 8px 10px;

    color: #475569;

    text-align: center;

    border-bottom: 1px solid #f1f5f9;
}


.monthly-room-table tbody tr:hover {
    background: #f9fbff;
}


.monthly-room-table tbody tr:last-child td {
    border-bottom: none;
}


/* Room */

.monthly-room-name {
    width: 130px;

    color: #1a3a5f !important;

    font-weight: 700;

    text-align: left !important;
}


/* Case */

.monthly-has-case {
    color: #1a3a5f !important;

    font-weight: 800;
}


/* Status */

.monthly-status {
    display: inline-flex;
    align-items: center;

    gap: 6px;

    font-size: 11px;
    font-weight: 600;
}


.monthly-status .status-dot {
    width: 7px;
    height: 7px;

    border-radius: 50%;
}


.monthly-status.active {
    color: #15803d;
}


.monthly-status.active .status-dot {
    background: #22c55e;
}


.monthly-status.empty {
    color: #94a3b8;
}


.monthly-status.empty .status-dot {
    background: #cbd5e1;
}


/* Footer */

.monthly-room-table tfoot td {
    padding: 10px;

    background: #f5f7fa;

    color: #1a3a5f;

    font-weight: 800;

    border-top: 2px solid #e2e8f0;

    border-bottom: none;
}


/* Responsive */

@media (max-width: 768px) {

    .monthly-room-header {
        align-items: flex-start;

        flex-direction: column;
    }


    .monthly-room-filter {
        width: 100%;
    }


    .monthly-room-filter select {
        flex: 1;
    }


    .monthly-room-summary {
        grid-template-columns: 1fr;
    }


    .monthly-room-table-wrap {
        margin-left: 12px;
        margin-right: 12px;
    }
}


/* ======================================================
   Smooth Animation - Bar + Line Chart
====================================================== */

/* แท่งกราฟค่อย ๆ สูงขึ้น */
.chart-bar {
    transform-box: fill-box;
    transform-origin: center bottom;

    animation: barGrow 0.8s cubic-bezier(0.22, 1, 0.36, 1) both;

    transition:
        fill 0.2s ease,
        opacity 0.2s ease;
}


/* ให้แต่ละแท่งขึ้นไม่พร้อมกัน */
.chart-bar:nth-child(1) {
    animation-delay: 0.05s;
}

.chart-bar:nth-child(2) {
    animation-delay: 0.10s;
}

.chart-bar:nth-child(3) {
    animation-delay: 0.15s;
}

.chart-bar:nth-child(4) {
    animation-delay: 0.20s;
}

.chart-bar:nth-child(5) {
    animation-delay: 0.25s;
}

.chart-bar:nth-child(6) {
    animation-delay: 0.30s;
}

.chart-bar:nth-child(7) {
    animation-delay: 0.35s;
}

.chart-bar:nth-child(8) {
    animation-delay: 0.40s;
}

.chart-bar:nth-child(9) {
    animation-delay: 0.45s;
}

.chart-bar:nth-child(10) {
    animation-delay: 0.50s;
}

.chart-bar:nth-child(11) {
    animation-delay: 0.55s;
}

.chart-bar:nth-child(12) {
    animation-delay: 0.60s;
}


@keyframes barGrow {
    0% {
        transform: scaleY(0);
        opacity: 0;
    }

    60% {
        opacity: 1;
    }

    100% {
        transform: scaleY(1);
        opacity: 1;
    }
}


/* ======================================================
   Trend Line Animation
====================================================== */

.chart-trend-line {
    fill: none;

    stroke: #f59e0b;
    stroke-width: 2;

    stroke-linejoin: round;
    stroke-linecap: round;

    /* ทำให้เส้นค่อย ๆ วาดออกมา */
    stroke-dasharray: 1000;
    stroke-dashoffset: 1000;

    animation:
        drawTrendLine 1.6s cubic-bezier(0.22, 1, 0.36, 1) 0.4s forwards;
}


@keyframes drawTrendLine {
    from {
        stroke-dashoffset: 1000;
    }

    to {
        stroke-dashoffset: 0;
    }
}


/* ======================================================
   Trend Points
====================================================== */

.chart-trend-point {
    fill: #f59e0b;

    stroke: white;
    stroke-width: 1.5;

    opacity: 0;

    transform-box: fill-box;
    transform-origin: center;

    animation:
        pointAppear 0.35s ease-out forwards;
}


/* จุดค่อย ๆ ขึ้นทีละจุด */

.chart-trend-point:nth-of-type(1) {
    animation-delay: 0.55s;
}

.chart-trend-point:nth-of-type(2) {
    animation-delay: 0.65s;
}

.chart-trend-point:nth-of-type(3) {
    animation-delay: 0.75s;
}

.chart-trend-point:nth-of-type(4) {
    animation-delay: 0.85s;
}

.chart-trend-point:nth-of-type(5) {
    animation-delay: 0.95s;
}

.chart-trend-point:nth-of-type(6) {
    animation-delay: 1.05s;
}

.chart-trend-point:nth-of-type(7) {
    animation-delay: 1.15s;
}

.chart-trend-point:nth-of-type(8) {
    animation-delay: 1.25s;
}

.chart-trend-point:nth-of-type(9) {
    animation-delay: 1.35s;
}

.chart-trend-point:nth-of-type(10) {
    animation-delay: 1.45s;
}

.chart-trend-point:nth-of-type(11) {
    animation-delay: 1.55s;
}

.chart-trend-point:nth-of-type(12) {
    animation-delay: 1.65s;
}


@keyframes pointAppear {
    0% {
        opacity: 0;
        transform: scale(0.2);
    }

    70% {
        opacity: 1;
        transform: scale(1.15);
    }

    100% {
        opacity: 1;
        transform: scale(1);
    }
}


/* ======================================================
   ตัวเลขบนแท่ง
====================================================== */

.chart-value-label {
    animation:
        valueAppear 0.45s ease-out 0.5s both;
}


@keyframes valueAppear {
    from {
        opacity: 0;
        transform: translateY(5px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}


/* ======================================================
   ลด motion สำหรับคนที่เปิด accessibility setting
====================================================== */

@media (prefers-reduced-motion: reduce) {

    .chart-bar,
    .chart-trend-line,
    .chart-trend-point,
    .chart-value-label {
        animation: none !important;
    }
}
</style>