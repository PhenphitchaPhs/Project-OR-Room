<template>
    <div class="main-layout">

        <Transition name="fade">
            <div v-if="isDetailModalOpen" class="detail-overlay" @click.self="closeDetailModal">
                <div class="detail-card">
                    <h2>Case Details</h2>
                    <div class="detail-grid" v-if="selectedCase">
                        <p><strong>HN:</strong> {{ selectedCase.hn }}</p>
                        <p><strong>Patient Name:</strong> {{ selectedCase.fullName }}</p>
                        <p><strong>Age:</strong> {{ selectedCase.age }}</p>
                        <p><strong>Gender:</strong> {{ selectedCase.gender === 'male' ? 'ชาย' : 'หญิง' }}</p>
                        <p><strong>Procedure:</strong> {{ selectedCase.procedure }}</p>
                        <p><strong>Surgery Date:</strong> {{ selectedCase.date }}</p>
                        <p><strong>Underlying:</strong> {{ selectedCase.underlying || '-' }}</p>
                        <p><strong>CXR:</strong> {{ selectedCase.cxrDate || '-' }} | {{ selectedCase.cxrNote || '-' }}
                        </p>
                        <p><strong>ECG:</strong> {{ selectedCase.ecgDate || '-' }} | {{ selectedCase.ecgNote || '-' }}
                        </p>
                        <p><strong>Lab:</strong> {{ selectedCase.labDate || '-' }} | {{ selectedCase.labNote || '-' }}
                        </p>
                        <p><strong>Admission:</strong> {{ selectedCase.admDate || '-' }} | {{ selectedCase.admNote ||
                            '-' }}</p>
                        <p><strong>Other Notes:</strong> {{ selectedCase.notes || '-' }}</p>
                    </div>
                    <button class="close-detail-btn" @click="closeDetailModal">Close</button>
                </div>
            </div>
        </Transition>

        <header class="top-nav">

            <!-- SEARCH -->
            <div class="search-box">
                <span class="material-icons search-icon">search</span>

                <input type="text" v-model="searchHN" placeholder="Search patient, HN, procedure" />

            </div>

        </header>

        <div class="dashboard-container">
            <h1 class="main-title">ระบบบริหารจัดการคิวห้องผ่าตัด</h1>
            <!-- OR Capacity Card -->
            <div class="or-capacity-card">

                <div class="capacity-header">
                    <div class="capacity-title">
                        <span class="material-icons">monitor_heart</span>
                        <span>OR Usage Today</span>
                    </div>

                    <span>{{ Math.round((usedMinutes / 60) * 10) / 10 }}/7 hrs.</span>
                </div>

                <div class="capacity-bar">
                    <div class="capacity-fill" :style="{
                        width: usagePercent + '%',
                        background: progressColor
                    }"></div>
                </div>

                <div class="capacity-detail">

                    <div class="remaining-time" :style="{ color: remainingMinutes <= 0 ? '#dc2626' : '' }">
                        <span class="material-icons small-icon">
                            {{ remainingMinutes <= 0 ? 'warning' : 'schedule' }} </span>

                                <span v-if="remainingMinutes > 0">
                                    {{ remainingHour }}h {{ remainingMin }}m left
                                </span>

                                <span v-else>
                                    Exceeded by {{ exceededHour }}h {{ exceededMin }}m
                                </span>
                    </div>

                    <div class="capacity-status" :class="{
                        warning: usagePercent >= 70 && usagePercent < 90,
                        danger: usagePercent >= 90 || remainingMinutes <= 0
                    }">

                        <span class="material-icons small-icon">
                            {{
                                usagePercent >= 90
                                    ? 'warning'
                                    : 'check_circle'
                            }}
                        </span>

                        <span>
                            {{
                                remainingMinutes <= 0 ? 'Exceeded 7-hour limit' : usagePercent >= 90
                                    ? 'OR almost full'
                                    : 'Next remaining time'
                            }}
                        </span>


                    </div>

                </div>

            </div>

            <div class="queue-card">
                <div class="queue-filter">
                    <button :class="{ active: filter === FILTERS.TODAY }" @click="filter = FILTERS.TODAY">
                        Today
                    </button>

                    <button :class="{ active: filter === FILTERS.UPCOMING }" @click="filter = FILTERS.UPCOMING">
                        Upcoming
                    </button>


                    <button :class="{ active: filter === FILTERS.SUCCEED }" @click="filter = FILTERS.SUCCEED">
                        Passed
                    </button>

                </div>

                <div class="tab-content-wrapper">
                    <div v-if="filter === FILTERS.TODAY">

                        <div v-if="todayCases.length === 0" class="empty-state">

                            <div class="icon-wrap">
                                <span class="material-icons">today</span>
                            </div>

                            <h3>No surgeries scheduled today</h3>

                            <p class="sub-text">
                                Cases for surgery dates will appear in today.
                            </p>

                        </div>

                        <div v-else>
                            <div class="reset-wrapper">
                                <button class="btn-reset" @click="resetQueue">
                                    <span class="material-icons">refresh</span> รีเซ็ตลำดับคิว
                                </button>
                            </div>

                            <draggable :model-value="filterBySearch(draggableToday)"
                                @update:modelValue="val => draggableToday = val" item-key="id"
                                ghost-class="sortable-ghost" chosen-class="sortable-chosen" drag-class="sortable-drag"
                                handle=".drag-handle" :animation="300" :force-fallback="true"
                                fallback-class="sortable-drag" @end="saveOrder">

                                <template #item="{ element: item }">
                                    <div class="case-card drag-item" @click="toggleDetail(item.id)">

                                        <div class="drag-handle">
                                            <span class="material-icons">more_horiz</span>
                                        </div>

                                        <div class="case-grid">
                                            <div class="drag-handle">
                                                <span class="material-icons">more_horiz</span>
                                            </div>

                                            <div class="grid-row">
                                                <span><strong>Surgery Date:</strong> {{ item.date }}</span>
                                            </div>

                                            <div class="grid-row">
                                                <span><strong>HN:</strong> {{ item.hn }}</span>
                                                <span><strong>Age:</strong> {{ item.age }} ปี</span>
                                            </div>

                                            <div class="grid-row">
                                                <span><strong>Patient:</strong> {{ item.fullName }}</span>
                                            </div>

                                            <div class="grid-row single">
                                                <span><strong>Procedure:</strong> {{ item.procedure }}</span>
                                            </div>

                                        </div>
                                        <div class="see-more-toggle">
                                            <span class="see-more-text">
                                                {{ expandedId === item.id ? 'See less' : 'See more' }}
                                            </span>
                                            <span class="material-icons see-more-icon">
                                                {{ expandedId === item.id ? 'expand_less' : 'expand_more' }}
                                            </span>
                                        </div>

                                        <transition name="expand">

                                            <div v-if="expandedId === item.id" class="case-detail">

                                                <div class="detail-row">
                                                    <strong>HN:</strong> {{ item.hn }}
                                                </div>

                                                <div class="detail-row">
                                                    <strong>Full Name:</strong> {{ item.fullName }}
                                                </div>

                                                <div class="detail-row">
                                                    <strong>Age:</strong> {{ item.age }}
                                                </div>

                                                <div class="detail-row">
                                                    <strong>Gender:</strong>
                                                    {{ item.gender === 'male' ? 'ชาย' : 'หญิง' }}
                                                </div>

                                                <div class="detail-row">
                                                    <strong>Underlying Disease(s):</strong>
                                                    {{ item.underlying || '-' }}
                                                </div>

                                                <div class="detail-row">
                                                    <strong>Proposed Procedure:</strong>
                                                    {{ item.procedure }}
                                                </div>

                                                <div class="detail-row">
                                                    <strong>Date:</strong>
                                                    {{ item.date }}
                                                </div>

                                                <div class="detail-row">
                                                    <strong>CXR:</strong>
                                                    {{ item.cxrDate || '-' }} |
                                                    {{ item.cxrNote || '-' }}
                                                </div>

                                                <div class="detail-row">
                                                    <strong>ECG:</strong>
                                                    {{ item.ecgDate || '-' }} |
                                                    {{ item.ecgNote || '-' }}
                                                </div>

                                                <div class="detail-row">
                                                    <strong>Lab:</strong>
                                                    {{ item.labDate || '-' }} |
                                                    {{ item.labNote || '-' }}
                                                </div>

                                                <div class="detail-row">
                                                    <strong>Admission:</strong>
                                                    {{ item.admDate || '-' }} |
                                                    {{ item.admNote || '-' }}
                                                </div>

                                                <div class="detail-row">
                                                    <strong>Notes:</strong>
                                                    {{ item.notes || '-' }}
                                                </div>

                                            </div>

                                        </transition>
                                        <div class="case-actions">
                                            <button class="btn-edit" @click.stop="router.push(`/booking/${item.id}`)">
                                                Edit
                                            </button>

                                            <button class="btn-delete" @click.stop="deleteCase(item.id)">
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </template>


                            </draggable>



                        </div>

                    </div>


                    <div v-if="filter === FILTERS.UPCOMING">

                        <div v-if="upcomingCases.length === 0" class="empty-state">
                            <div class="icon-wrap">
                                <span class="material-icons">assignment</span>
                            </div>
                            <h3>No upcoming surgery cases</h3>
                            <p class="sub-text">Please ensure all patient records are updated.</p>
                        </div>

                        <div v-else>
                            <div class="reset-wrapper">
                                <button class="btn-reset" @click="resetQueue">
                                    <span class="material-icons">refresh</span> รีเซ็ตลำดับคิว
                                </button>
                            </div>

                            <!-- อันนี้ที่เลื่อนก้าดของอัพคัมมิ่ง -->

                            <draggable :model-value="filterBySearch(draggableUpcoming)"
                                @update:modelValue="val => draggableUpcoming = val" item-key="id"
                                ghost-class="sortable-ghost" chosen-class="sortable-chosen" drag-class="sortable-drag"
                                handle=".drag-handle" :animation="300" :force-fallback="true"
                                fallback-class="sortable-drag" @end="saveOrder">

                                <template #item="{ element: item }">

                                    <div class="case-card drag-item" @click="toggleDetail(item.id)">
                                        <div class="drag-handle">
                                            <span class="material-icons">more_horiz</span>
                                        </div>


                                        <!-- เคสการ์ด -->

                                        <div class="case-grid">
                                            <div class="grid-row">
                                                <span><strong>Surgery Date:</strong> {{ item.date }}</span>

                                            </div>

                                            <div class="grid-row">
                                                <span><strong>HN:</strong> {{ item.hn }}</span>
                                                <span><strong>Age:</strong> {{ item.age }} ปี</span>
                                            </div>

                                            <div class="grid-row">
                                                <span><strong>Patient:</strong> {{ item.fullName }}</span>
                                            </div>

                                            <div class="grid-row single">
                                                <span><strong>Procedure:</strong> {{ item.procedure }}</span>
                                            </div>
                                        </div>
                                        <div class="see-more-toggle">
                                            <span class="see-more-text">
                                                {{ expandedId === item.id ? 'See less' : 'See more' }}
                                            </span>
                                            <span class="material-icons see-more-icon">
                                                {{ expandedId === item.id ? 'expand_less' : 'expand_more' }}
                                            </span>
                                        </div>

                                        <transition name="expand">
                                            <div v-if="expandedId === item.id" class="case-detail">
                                                <div class="detail-row"><strong>HN:</strong> {{ item.hn }}</div>
                                                <div class="detail-row"><strong>Full Name:</strong> {{ item.fullName }}
                                                </div>
                                                <div class="detail-row"><strong>Age:</strong> {{ item.age }}</div>
                                                <div>
                                                    <strong>Gender:</strong>
                                                    {{ item.gender === 'male' ? 'ชาย' : 'หญิง' }}
                                                </div>
                                                <div class="detail-row"><strong>Underlying Disease(s):</strong> {{
                                                    item.underlying || '-' }}</div>
                                                <div class="detail-row"><strong>Proposed Procedure:</strong> {{
                                                    item.procedure
                                                }}</div>
                                                <div class="detail-row"><strong>Date:</strong> {{ item.date }}</div>

                                                <div class="detail-row"><strong>CXR:</strong> {{ item.cxrDate || '-' }}
                                                    | {{
                                                        item.cxrNote || '-' }}</div>
                                                <div class="detail-row"><strong>ECG:</strong> {{ item.ecgDate || '-' }}
                                                    | {{
                                                        item.ecgNote || '-' }}</div>
                                                <div class="detail-row"><strong>Lab:</strong> {{ item.labDate || '-' }}
                                                    | {{
                                                        item.labNote || '-' }}</div>
                                                <div class="detail-row"><strong>Admission:</strong> {{ item.admDate ||
                                                    '-' }} |
                                                    {{ item.admNote || '-' }}</div>


                                                <div class="detail-row"><strong>Notes:</strong> {{ item.notes || '-' }}
                                                </div>

                                            </div>
                                        </transition>

                                        <div class="case-actions">
                                            <button class="btn-edit" @click.stop="editCase(item.id)">
                                                Edit
                                            </button>

                                            <button class="btn-delete" @click.stop="deleteCase(item.id)">
                                                Cancel
                                            </button>
                                        </div>


                                    </div>
                                </template>
                            </draggable>
                        </div>



                    </div>


                    <div v-if="filter === FILTERS.SUCCEED">

                        <!-- SUB TAB -->
                        <div class="queue-filter sub-filter">

                            <button :class="{
                                active: succeedTab === FILTERS.COMPLETE,
                                'complete-active': succeedTab === FILTERS.COMPLETE
                            }" @click="succeedTab = FILTERS.COMPLETE">
                                Completed
                            </button>

                            <button :class="{
                                active: succeedTab === FILTERS.NOT_COMPLETE,
                                'cancelled-active': succeedTab === FILTERS.NOT_COMPLETE
                            }" @click="succeedTab = FILTERS.NOT_COMPLETE">
                                {{ FILTERS.NOT_COMPLETE }}
                            </button>

                        </div>

                        <!-- COMPLETE -->
                        <div v-if="succeedTab === FILTERS.COMPLETE">

                            <div v-if="completeCases.length === 0" class="empty-state">

                                <div class="icon-wrap">
                                    <span class="material-icons">check_circle</span>
                                </div>

                                <h3>No completed surgery cases</h3>

                            </div>

                            <div v-else>

                                <div v-for="item in filterBySearch(completeCases)" :key="item.id"
                                    :ref="el => setCaseRef(el, item, FILTERS.COMPLETE)" class="case-card succeed-item"
                                    @click="toggleDetail(item.id)">

                                    <div class="case-grid">
                                        <div class="grid-row">
                                            <span><strong>Surgery Date:</strong> {{ item.date }}</span>

                                        </div>

                                        <div class="grid-row">
                                            <span><strong>HN:</strong> {{ item.hn }}</span>
                                            <span><strong>Age:</strong> {{ item.age }} ปี</span>
                                        </div>

                                        <div class="grid-row">
                                            <span><strong>Patient:</strong> {{ item.fullName }}</span>
                                        </div>

                                        <div class="grid-row single">
                                            <span><strong>Procedure:</strong> {{ item.procedure }}</span>
                                        </div>
                                    </div>
                                    <div class="see-more-toggle">
                                        <span class="see-more-text">
                                            {{ expandedId === item.id ? 'See less' : 'See more' }}
                                        </span>
                                        <span class="material-icons see-more-icon">
                                            {{ expandedId === item.id ? 'expand_less' : 'expand_more' }}
                                        </span>
                                    </div>

                                    <!-- DETAIL -->
                                    <transition name="expand">

                                        <div v-if="expandedId === item.id" class="case-detail">

                                            <div class="detail-row">
                                                <strong>HN:</strong> {{ item.hn }}
                                            </div>

                                            <div class="detail-row">
                                                <strong>Full Name:</strong> {{ item.fullName }}
                                            </div>

                                            <div class="detail-row">
                                                <strong>Age:</strong> {{ item.age }}
                                            </div>

                                            <div class="detail-row">
                                                <strong>Gender:</strong>
                                                {{ item.gender === 'male' ? 'ชาย' : 'หญิง' }}
                                            </div>

                                            <div class="detail-row">
                                                <strong>Underlying Disease(s):</strong>
                                                {{ item.underlying || '-' }}
                                            </div>

                                            <div class="detail-row">
                                                <strong>Proposed Procedure:</strong>
                                                {{ item.procedure }}
                                            </div>

                                            <div class="detail-row">
                                                <strong>Date:</strong>
                                                {{ item.date }}
                                            </div>

                                            <div class="detail-row">
                                                <strong>CXR:</strong>
                                                {{ item.cxrDate || '-' }} |
                                                {{ item.cxrNote || '-' }}
                                            </div>

                                            <div class="detail-row">
                                                <strong>ECG:</strong>
                                                {{ item.ecgDate || '-' }} |
                                                {{ item.ecgNote || '-' }}
                                            </div>

                                            <div class="detail-row">
                                                <strong>Lab:</strong>
                                                {{ item.labDate || '-' }} |
                                                {{ item.labNote || '-' }}
                                            </div>

                                            <div class="detail-row">
                                                <strong>Admission:</strong>
                                                {{ item.admDate || '-' }} |
                                                {{ item.admNote || '-' }}
                                            </div>

                                            <div class="detail-row">
                                                <strong>Notes:</strong>
                                                {{ item.notes || '-' }}
                                            </div>

                                        </div>

                                    </transition>

                                </div>

                            </div>

                        </div>

                        <!-- NOT COMPLETE -->
                        <div v-if="succeedTab === FILTERS.NOT_COMPLETE">

                            <div v-if="notCompleteCases.length === 0" class="empty-state">

                                <div class="icon-wrap">
                                    <span class="material-icons">event_busy</span>
                                </div>

                                <h3>No incomplete surgery cases</h3>

                            </div>

                            <div v-else>

                                <div v-for="item in filterBySearch(notCompleteCases)" :key="item.id"
                                    :ref="el => setCaseRef(el, item, FILTERS.NOT_COMPLETE)"
                                    class="case-card not-complete-item" @click="toggleDetail(item.id)">


                                    <div class="case-grid">

                                        <div class="grid-row">
                                            <span><strong>Date:</strong> {{ item.date }}</span>
                                            <span><strong>HN:</strong> {{ item.hn }}</span>
                                            <span><strong>Patient:</strong> {{ item.fullName }}</span>
                                            <span><strong>Age:</strong> {{ item.age }} ปี</span>
                                        </div>

                                        <div class="grid-row">
                                            <span><strong>Procedure:</strong> {{ item.procedure }}</span>
                                        </div>
                                        <!-- DETAIL -->
                                        <transition name="expand">

                                            <div v-if="expandedId === item.id" class="case-detail">

                                                <div class="detail-row">
                                                    <strong>HN:</strong> {{ item.hn }}
                                                </div>

                                                <div class="detail-row">
                                                    <strong>Full Name:</strong> {{ item.fullName }}
                                                </div>

                                                <div class="detail-row">
                                                    <strong>Age:</strong> {{ item.age }}
                                                </div>

                                                <div class="detail-row">
                                                    <strong>Gender:</strong>
                                                    {{ item.gender === 'male' ? 'ชาย' : 'หญิง' }}
                                                </div>

                                                <div class="detail-row">
                                                    <strong>Underlying Disease(s):</strong>
                                                    {{ item.underlying || '-' }}
                                                </div>

                                                <div class="detail-row">
                                                    <strong>Proposed Procedure:</strong>
                                                    {{ item.procedure }}
                                                </div>

                                                <div class="detail-row">
                                                    <strong>Date:</strong>
                                                    {{ item.date }}
                                                </div>

                                                <div class="detail-row">
                                                    <strong>CXR:</strong>
                                                    {{ item.cxrDate || '-' }} |
                                                    {{ item.cxrNote || '-' }}
                                                </div>

                                                <div class="detail-row">
                                                    <strong>ECG:</strong>
                                                    {{ item.ecgDate || '-' }} |
                                                    {{ item.ecgNote || '-' }}
                                                </div>

                                                <div class="detail-row">
                                                    <strong>Lab:</strong>
                                                    {{ item.labDate || '-' }} |
                                                    {{ item.labNote || '-' }}
                                                </div>

                                                <div class="detail-row">
                                                    <strong>Admission:</strong>
                                                    {{ item.admDate || '-' }} |
                                                    {{ item.admNote || '-' }}
                                                </div>

                                                <div class="detail-row">
                                                    <strong>Notes:</strong>
                                                    {{ item.notes || '-' }}
                                                </div>

                                            </div>

                                        </transition>

                                    </div>

                                    <!-- ACTION -->
                                    <div class="case-actions">

                                        <button class="btn-restore" @click.stop="restoreCase(item.id)">

                                            <span class="material-icons">
                                                restore
                                            </span>

                                            Back to Upcoming

                                        </button>

                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>
            </div>

            <div class="info-section">
                <div class="info-header">
                    <span class="material-icons info-icon">info</span>
                    <h3>Additional Information</h3>
                </div>
                <ul class="info-list">
                    <li>
                        <span class="material-icons check-bullet">check</span>
                        Cases can be canceled before surgery date.
                    </li>
                    <li>
                        <span class="material-icons check-bullet">check</span>
                        Please arrive on time for the convenience of everyone.
                    </li>
                    <li>
                        <span class="material-icons check-bullet">check</span>
                        If there is a problem, please contact staff.
                    </li>
                </ul>
            </div>
        </div>
    </div>
    <button class="floating-add-btn" @click="goAddPatient">
        + Add Queue
    </button>
    <Transition name="fade">
        <div v-if="isConfirmModalOpen" class="modal-overlay-center">
            <div class="white-modal-card">

                <h2 class="modal-msg-title">
                    {{ confirmMessage }}
                </h2>

                <div class="modal-button-group">

                    <button class="btn-cancel-gray" @click="isConfirmModalOpen = false">
                        Cancel
                    </button>

                    <button class="btn-confirm-red" @click="handleConfirm">
                        Confirm
                    </button>

                </div>

            </div>
        </div>
    </Transition>
    <Transition name="fade">
        <div v-if="isMessageModalOpen" class="modal-overlay-center">
            <div class="white-modal-card">

                <h2 class="modal-msg-title">
                    {{ messageTitle }}
                </h2>

                <div class="modal-button-group">
                    <button class="btn-confirm-green" @click="isMessageModalOpen = false">
                        OK
                    </button>
                </div>

            </div>
        </div>

    </Transition>

    <Transition name="fade">
        <div v-if="isRestoreModalOpen" class="modal-overlay-center">
            <div class="white-modal-card">

                <h2 class="modal-msg-title">
                    Move Back to Upcoming
                </h2>

                <div style="margin: 20px 0; text-align: left;">

                    <label>Surgery Date</label>

                    <VueDatePicker v-model="restoreData.date" :enable-time-picker="false" auto-apply text-input
                        model-type="yyyy-MM-dd" format="yyyy-MM-dd" :year-range="[1900, 2700]" teleport="body"
                        :disabled-dates="disabledDates" :day-class="highlightHolidays" />

                </div>

                <div class="modal-button-group">

                    <button class="btn-cancel-gray" @click="isRestoreModalOpen = false">
                        Cancel
                    </button>

                    <button class="btn-confirm-green" @click="confirmRestoreCase">
                        Confirm
                    </button>

                </div>

            </div>
        </div>
    </Transition>


</template>

<script setup>

import { ref, onMounted, watch, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import VueDatePicker from '@vuepic/vue-datepicker'
import draggable from 'vuedraggable'
import '@vuepic/vue-datepicker/dist/main.css'

const editCase = (id) => {
    router.push(`/booking/${id}`)
}

const getRestoredCases = () => {
    return JSON.parse(
        localStorage.getItem('restoredCases') || '[]'
    )
}

const saveRestoredCase = (id) => {

    const restoredCases = getRestoredCases()

    if (!restoredCases.includes(id)) {

        restoredCases.push(id)

        localStorage.setItem(
            'restoredCases',
            JSON.stringify(restoredCases)
        )
    }
}

const thaiHolidays = {
    '2026-01-01': 'วันขึ้นปีใหม่',
    '2026-01-02': 'วันหยุดพิเศษช่วงปีใหม่',

    '2026-03-03': 'วันมาฆบูชา',

    '2026-04-06': 'วันจักรี',

    '2026-04-13': 'วันสงกรานต์',
    '2026-04-14': 'วันสงกรานต์',
    '2026-04-15': 'วันสงกรานต์',

    '2026-05-01': 'วันแรงงานแห่งชาติ',
    '2026-05-04': 'วันฉัตรมงคล',
    '2026-05-13': 'วันพืชมงคล',

    '2026-06-01': 'ชดเชยวันวิสาขบูชา',
    '2026-06-03': 'วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี',

    '2026-07-28': 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว',
    '2026-07-29': 'วันอาสาฬหบูชา',

    '2026-08-12': 'วันแม่แห่งชาติ',

    '2026-10-13': 'วันนวมินทรมหาราช',
    '2026-10-23': 'วันปิยมหาราช',

    '2026-12-05': 'วันพ่อแห่งชาติ',
    '2026-12-07': 'ชดเชยวันพ่อแห่งชาติ',

    '2026-12-10': 'วันรัฐธรรมนูญ',
    '2026-12-31': 'วันสิ้นปี'
}
const highlightHolidays = (date) => {
    const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    if (formatted in thaiHolidays) {
        return 'is-thai-holiday'
    }
    return ''
}

const disabledDates = (date) => {
    const dayOfWeek = date.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return true
    }
    console.log(date)

    const formatted =
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

    return formatted in thaiHolidays
}
const isConfirmModalOpen = ref(false)
const confirmMessage = ref('')
const confirmAction = ref(null)

const openConfirmDialog = (message, action) => {
    confirmMessage.value = message
    confirmAction.value = action
    isConfirmModalOpen.value = true
}

const isMessageModalOpen = ref(false)
const messageTitle = ref('')


const showMessageDialog = (message) => {
    messageTitle.value = message
    isMessageModalOpen.value = true
}
const handleConfirm = async () => {

    if (confirmAction.value) {
        await confirmAction.value()
    }

    isConfirmModalOpen.value = false
    confirmAction.value = null
}

const FILTERS = {
    UPCOMING: 'Upcoming',
    TODAY: 'Today',
    SUCCEED: 'Pass',
    COMPLETE: 'Complete',
    NOT_COMPLETE: 'Cancelled'
}


const searchHN = ref('')

const caseRefs = ref({})

const normalizeText = (text) => {
    return String(text || '')
        .toLowerCase()
        .replace(/\s+/g, '')
}

// computed สำหรับกรองข้อมูล
const filterBySearch = (list) => {

    const keyword = normalizeText(searchHN.value)

    if (!keyword) return list

    return list.filter(item => {

        // รองรับเพศ
        const genderText =
            item.gender === 'female'
                ? 'female หญิง เพศหญิง woman'
                : 'male ชาย เพศชาย man'

        // รองรับวันที่หลายรูปแบบ
        const dateObj = new Date(item.date)

        const day = String(dateObj.getDate()).padStart(2, '0')
        const month = String(dateObj.getMonth() + 1).padStart(2, '0')
        const year = dateObj.getFullYear()

        const dateFormats = [
            item.date,                    // 2026-06-19
            `${day}/${month}/${year}`,    // 19/06/2026
            `${day}-${month}-${year}`,    // 19-06-2026
            `${day}${month}${year}`,      // 19062026
            `${year}/${month}/${day}`,    // 2026/06/19
            `${year}${month}${day}`       // 20260619
        ].join(' ')

        const searchableText = normalizeText([
            item.hn,
            item.fullName,
            item.procedure,
            item.underlying,
            item.notes,
            item.room,
            item.doctorName,
            item.cxrNote,
            item.ecgNote,
            item.labNote,
            item.admNote,
            genderText,
            dateFormats
        ].join(' '))

        return searchableText.includes(keyword)
    })
}

const setCaseRef = (el, item, tab = FILTERS.UPCOMING) => {

    if (!el || !item?.id) return

    caseRefs.value[item.id] = {
        el,
        tab,
        item
    }
}

const searchCase = async () => {

    const keyword = normalizeText(searchHN.value)

    if (!keyword) return

    let targetList = []

    // CURRENT TAB ONLY
    if (filter.value === FILTERS.TODAY) {

        targetList = todayCases.value.map(item => ({
            item,
            tab: FILTERS.TODAY
        }))

    }
    else if (filter.value === FILTERS.UPCOMING) {

        targetList = upcomingCases.value.map(item => ({
            item,
            tab: FILTERS.UPCOMING
        }))

    } else if (
        filter.value === FILTERS.SUCCEED &&
        succeedTab.value === FILTERS.COMPLETE
    ) {

        targetList = completeCases.value.map(item => ({
            item,
            tab: FILTERS.COMPLETE
        }))

    } else if (
        filter.value === FILTERS.SUCCEED &&
        succeedTab.value === FILTERS.NOT_COMPLETE
    ) {

        targetList = notCompleteCases.value.map(item => ({
            item,
            tab: FILTERS.NOT_COMPLETE
        }))
    }

    // FIND MATCH
    const found = targetList.find(({ item }) => {

        const searchableText = normalizeText([
            item.hn,
            item.fullName,
            item.procedure,
            item.underlying,
            item.notes,
            item.room,
            item.date,
            item.gender,
            item.doctorName,
            item.cxrNote,
            item.ecgNote,
            item.labNote,
            item.admNote
        ].join(' '))

        return searchableText.includes(keyword)
    })

    if (!found) return


}




// รวมเวลาเฉพาะ "today"
const usedMinutes = computed(() => {

    return todayCases.value.reduce((sum, booking) => {

        const match =
            booking.procedure?.match(/(\d+)\s*mins?/i)

        const minutes =
            match ? parseInt(match[1]) : 0

        return sum + minutes

    }, 0)

})
const restoreCase = (id) => {

    const target = bookings.value.find(
        item => item.id === id
    )

    if (!target) return

    restoreData.value = {
        id,
        date: target.date || '',
        time: target.time || ''
    }
    isRestoreModalOpen.value = true

}


const confirmRestoreCase = async () => {

    try {

        const res = await fetch(
            `https://or-room-backend.rockzee2018.workers.dev/api/bookings/${restoreData.value.id}/status`,
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: FILTERS.UPCOMING
                })
            }
        )

        if (!res.ok) throw new Error()

        const target = bookings.value.find(
            item => item.id === restoreData.value.id
        )

        if (target) {

            target.status = FILTERS.UPCOMING

            target.date = restoreData.value.date

            target.time = restoreData.value.time

        }

        saveRestoredCase(
            restoreData.value.id
        )

        isRestoreModalOpen.value = false

    } catch (e) {

        console.error(e)

    }

}

const MAX_MINUTES = 420
// เปอร์เซ็นต์ progress  อันนี้เกิน7ชม.ได้
const usagePercent = computed(() => {
    return (usedMinutes.value / MAX_MINUTES) * 100
})


// เวลาคงเหลือ
const remainingMinutes = computed(() => {
    return Math.max(MAX_MINUTES - usedMinutes.value, 0)
})

const remainingHour = computed(() => {
    return Math.floor(remainingMinutes.value / 60)
})

const remainingMin = computed(() => {
    return remainingMinutes.value % 60
})
const exceededMinutes = computed(() => {
    return Math.max(usedMinutes.value - MAX_MINUTES, 0)
})

const exceededHour = computed(() => {
    return Math.floor(exceededMinutes.value / 60)
})

const exceededMin = computed(() => {
    return exceededMinutes.value % 60
})

// เปลี่ยนสี progress bar
const progressColor = computed(() => {

    if (usagePercent.value >= 90) {
        return '#dc2626'
    }

    if (usagePercent.value >= 70) {
        return '#f59e0b'
    }

    return '#1e3a8a'
})

const router = useRouter()
const API_URL = 'https://or-room-backend.rockzee2018.workers.dev/api/bookings'

// --- State ---
const bookings = ref([])
const userLicense = ref('')
const doctorName = ref('')
const filter = ref('Today')
const succeedTab = ref(FILTERS.COMPLETE)
const expandedId = ref(null)
const isLoading = ref(false)



// ================= ระบบจัดเรียงคิว (รวม Drag&Drop แบบใหม่) =================
const sortCases = (arr) => {
    const urgencyScore = { 'Emergency': 3, 'Urgent': 2, 'Normal': 1 }
    return [...arr].sort((a, b) => {
        // Tier 0: เรียงตามวันก่อนเสมอ
        if (a.date !== b.date) return new Date(a.date) - new Date(b.date)

        // 🌟 ถ้าผู้ใช้เคยลากคิวจัดลำดับ (queueOrder) ให้ยึดตามที่ผู้ใช้จัดเป็นหลัก!
        const qA = a.queueOrder || 999
        const qB = b.queueOrder || 999
        if (qA !== qB) return qA - qB

        // ถ้าเป็นคิวใหม่ (ยังไม่เคยลากจัด) ให้ใช้ระบบอัจฉริยะแบบเดิม
        const urgA = urgencyScore[a.urgency] || 1
        const urgB = urgencyScore[b.urgency] || 1
        if (urgA !== urgB) return urgB - urgA

        if (a.urgency !== 'Emergency') {
            const infA = a.isInfected ? 1 : 0
            const infB = b.isInfected ? 1 : 0
            if (infA !== infB) return infA - infB

            const npoA = a.isNpoRisk ? 1 : 0
            const npoB = b.isNpoRisk ? 1 : 0
            if (npoA !== npoB) return npoB - npoA
        }

        const ageA = parseInt(a.age) || 0
        const ageB = parseInt(b.age) || 0
        if (ageA !== ageB) return ageB - ageA

        if (a.gender !== b.gender) return a.gender === 'female' ? -1 : 1

        return 0
    })
}

// ================= Computed Properties =================
const todayCases = computed(() => {

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return sortCases(
        bookings.value.filter(item => {

            const surgeryDate = new Date(item.date)
            surgeryDate.setHours(0, 0, 0, 0)

            return (
                (item.status === FILTERS.UPCOMING || !item.status) &&
                surgeryDate.getTime() === today.getTime()
            )
        })
    )

})

const upcomingCases = computed(() => {

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return sortCases(
        bookings.value.filter(item => {

            const surgeryDate = new Date(item.date)
            surgeryDate.setHours(0, 0, 0, 0)

            const isFuture = surgeryDate > today

            return (
                (item.status === FILTERS.UPCOMING || !item.status)
                && isFuture
            )
        })
    )

})
const draggableToday = ref([])

// คอยดักส่องและอัปเดตข้อมูลลิสต์ให้กับแท็บ Today
watch(
    todayCases,
    (newCases) => {
        draggableToday.value = [...newCases]
    },
    { immediate: true }
)
const draggableUpcoming = ref([])
watch(
    upcomingCases,
    (newCases) => {
        draggableUpcoming.value = [...newCases]
    },
    { immediate: true }
)
const saveOrder = async (event) => {
    // ดึงอาเรย์ชุดข้อมูลตามหน้าแท็บที่ทำงานอยู่ปัจจุบัน
    const activeList = filter.value === FILTERS.TODAY
        ? draggableToday.value
        : draggableUpcoming.value

    const updates = activeList.map((item, index) => {
        item.queueOrder = index + 1
        return {
            id: item.id,
            queueOrder: item.queueOrder
        }
    })

    try {
        await fetch(
            'https://or-room-backend.rockzee2018.workers.dev/api/bookings/reorder',
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ updates })
            }
        )
    } catch (e) {
        console.error('อัปเดตคิวไม่สำเร็จ', e)
    }
}

const completeCases = computed(() => {

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const restoredCases =
        getRestoredCases()

    return sortCases(
        bookings.value.filter(item => {

            const surgeryDate =
                new Date(item.date)

            surgeryDate.setHours(
                0, 0, 0, 0
            )


            const autoComplete =
                surgeryDate < today &&
                (item.status === FILTERS.UPCOMING || !item.status) &&
                !restoredCases.includes(item.id)

            return (
                item.status === FILTERS.COMPLETE ||
                autoComplete
            )
        })
    )
})

const notCompleteCases = computed(() =>
    sortCases(
        bookings.value.filter(
            item => item.status === FILTERS.NOT_COMPLETE
        )
    )
)

// ================= ระบบ Drag & Drop เลื่อนคิว =================


// ================= ฟังก์ชันรีเซ็ตคิว =================
const resetQueue = async () => {
    const resetQueue = () => {

        openConfirmDialog(
            'Reset queue order and use automatic sorting?',
            async () => {

                const updates = upcomingCases.value.map(item => ({
                    id: item.id,
                    queueOrder: 999
                }))

                bookings.value.forEach(b => {
                    if (b.status !== FILTERS.SUCCEED) {
                        b.queueOrder = 999
                    }
                })

                try {

                    await fetch(
                        'https://or-room-backend.rockzee2018.workers.dev/api/bookings/reorder',
                        {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ updates })
                        }
                    )

                } catch (e) {
                    console.error(e)
                }

            }
        )

    }

    // 1. ตั้งค่า queueOrder เป็น 999 ให้หมด
    const updates = upcomingCases.value.map(item => {
        return { id: item.id, queueOrder: 999 }
    })

    // 2. อัปเดต UI ทันที
    bookings.value.forEach(b => {
        if (b.status !== FILTERS.SUCCEED) b.queueOrder = 999
    })

    // 3. บันทึกลงฐานข้อมูล
    try {
        await fetch('https://or-room-backend.rockzee2018.workers.dev/api/bookings/reorder', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates })
        })
        showMessageDialog('✅ รีเซ็ตการจัดคิวเรียบร้อย')
    } catch (e) {
        console.error("❌ รีเซ็ตคิวไม่สำเร็จ", e)
    }
}


// ================= โหลดข้อมูลจาก Backend =================
const fetchBookings = async () => {
    isLoading.value = true
    try {
        const license = localStorage.getItem('userLicense')
        const response = await fetch(`${API_URL}?license=${license}`)
        const data = await response.json()
        bookings.value = Array.isArray(data) ? data : []
    } catch (error) { console.error("❌ ดึงคิวไม่สำเร็จ:", error) }
    finally { isLoading.value = false }
}

onMounted(() => {
    const savedLicense = localStorage.getItem('userLicense')
    const savedName = localStorage.getItem('doctorName')

    if (savedLicense) {
        userLicense.value = savedLicense
    }
    if (savedName) doctorName.value = savedName
    fetchBookings()
})

// ================= ฟังก์ชัน UI อื่นๆ =================
const toggleDetail = (id) => expandedId.value = expandedId.value === id ? null : id
const isDetailModalOpen = ref(false)
const selectedCase = ref(null)
const isRestoreModalOpen = ref(false)

const restoreData = ref({
    id: null,
    date: '',
    time: ''
})

const goAddPatient = () => router.push('/booking')
const openCaseDetail = (item) => { selectedCase.value = item; isDetailModalOpen.value = true }
const closeDetailModal = () => { isDetailModalOpen.value = false }

const deleteCase = (id) => {

    openConfirmDialog(
        'Move this case to Not Complete?',
        async () => {

            try {

                const res = await fetch(
                    `https://or-room-backend.rockzee2018.workers.dev/api/bookings/${id}/status`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            status: FILTERS.NOT_COMPLETE
                        })
                    }
                )

                if (!res.ok) throw new Error()

                const target = bookings.value.find(
                    item => item.id === id
                )

                if (target) {
                    target.status = FILTERS.NOT_COMPLETE
                }

            } catch (e) {
                console.error(e)
            }

        }
    )

}
const markAsSucceed = async (id) => {
    try {
        const res = await fetch(`https://or-room-backend.rockzee2018.workers.dev/api/bookings/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Succeed' })
        })
        if (!res.ok) throw new Error()

        // อัปเดต UI
        const target = bookings.value.find(item => item.id === id)
        if (target) { target.status = FILTERS.SUCCEED; filter.value = FILTERS.SUCCEED; }
    } catch (e) {
        showMessageDialog('❌ อัปเดต status ไม่สำเร็จ')
    }
}

















</script>

<style scoped>
@import url('https://fonts.googleapis.com/icon?family=Material+Icons');

/* --- Layout & Basic --- */
.main-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: #f5f7fa;
}

/* --- สี Navy Blue สำหรับ Top Nav --- */
.top-nav {
    background-color: #1a3a5f !important;
    height: 80px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px;
}

/* --- Main Dashboard Content (UI อัปเดตใหม่) --- */
.dashboard-container {
    padding: 20px;
    flex-grow: 1;
}

.main-title {
    text-align: center;
    color: #1a3a5f;
    font-size: 1.6rem;
    font-weight: bold;
    margin: 30px 0;
}

.queue-card {
    width: 90%;
    max-width: 500px;
    margin: 0 auto 30px auto;
    background: white;
    border-radius: 20px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
    overflow: hidden;
}

.queue-filter {
    display: flex;
    padding: 15px;
    gap: 10px;
    background: #f8f9fa;
}

.queue-filter button {
    flex: 1;
    padding: 10px 0;
    border-radius: 10px;
    border: 1px solid #eee;
    background: white;
    color: #444;
    font-weight: 600;
    cursor: pointer;
    transition: 0.3s;
}

.queue-filter button.active {
    background: #1a3a5f;
    color: white;
    border-color: #1a3a5f;
}

/* COMPLETE TAB */
.sub-filter button.complete-active {
    background: #16a34a;
    color: white;
    border-color: #16a34a;
}

.case-card.succeed-item {
    padding-bottom: 55px !important;
}

/* CANCELLED TAB */
.sub-filter button.cancelled-active {
    background: #790606;
    color: white;
    border-color: #790606;
}

.empty-state {
    text-align: center;
    padding: 60px 20px;
}

.case-card {
    background: white;
    padding: 16px;
    border-radius: 12px;
    margin-bottom: 12px;
    margin-block: 20px;
    margin-left: 10px;
    margin-right: 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);

}

.sortable-ghost {
    opacity: 0.3 !important;
    background: #f0f4f8 !important;
    border: 2px dashed #94a3b8 !important;
}

.sortable-chosen {
    cursor: grabbing !important;
}

.sortable-drag {
    opacity: 1 !important;
    background: #ffffff !important;

    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15) !important;
    z-index: 9999 !important;
    cursor: grabbing !important;
}


/* --- Succeed Style --- */
.succeed-item {
    border-left: 5px solid #03c172;
    background: #fdfdfd;
}

.succeed-item:hover {
    background: #f0fff4;
}

.icon-wrap {
    width: 70px;
    height: 70px;
    background: #f0f2f5;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 0 auto 20px auto;
}

.icon-wrap .material-icons {
    font-size: 35px;
    color: #90a4ae;
}

.empty-state h3 {
    color: #333;
    font-size: 1.2rem;
    margin-bottom: 8px;
}

.sub-text {
    color: #888;
    font-size: 0.9rem;
    margin-bottom: 30px;
}

.add-btn {
    background: #1a3a5f;
    color: white;
    border: none;
    padding: 12px 35px;
    border-radius: 12px;
    font-weight: bold;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(26, 58, 95, 0.3);
    transition: transform 0.2s;
}

.add-btn:hover {
    transform: translateY(-2px);
}

/* --- Info Section อัปเดตใหม่ตามวาด --- */
.info-section {
    max-width: 500px;
    margin: 0 auto 50px auto;
    background: #eef2f7;
    padding: 20px;
    border-radius: 16px;
}

.info-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 15px;
    color: #1a3a5f;
}

.info-header h3 {
    font-size: 1.1rem;
    font-weight: bold;
    margin: 0;
}

.info-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.info-list li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 12px;
    color: #4a5e75;
    font-size: 0.95rem;
}

.check-bullet {
    font-size: 18px;
    color: #1a3a5f;
    margin-top: 2px;
}

/* --- Modals & Transitions (ของเดิมทั้งหมด) --- */
.modal-overlay-center {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 4000;
    background: rgba(0, 0, 0, 0.4);
}

.white-modal-card {
    background: white;
    width: 90%;
    max-width: 320px;
    padding: 30px 20px;
    border-radius: 24px;
    text-align: center;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-msg-title {
    color: #2c4c87;
    font-size: 1.1rem;
    margin-bottom: 25px;
}

.modal-button-group {
    display: flex;
    justify-content: center;
    gap: 15px;
}

.btn-confirm-green {
    background-color: #03c172;
    color: white;
    border: none;
    padding: 10px 25px;
    border-radius: 12px;
    font-weight: bold;
    cursor: pointer;
}

.btn-confirm-red {
    background-color: #d50000;
    color: white;
    border: none;
    padding: 10px 25px;
    border-radius: 12px;
    font-weight: bold;
    cursor: pointer;
}

.btn-cancel-gray {
    background-color: #eee;
    color: #666;
    border: none;
    padding: 10px 25px;
    border-radius: 12px;
    font-weight: bold;
    cursor: pointer;
}

/* Transitions */
.slide-enter-active,
.slide-leave-active {
    transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
    transform: translateX(-100%);
}

.slide-enter-to,
.slide-leave-from {
    transform: translateX(0);
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.top-action {
    margin-bottom: 16px;
    text-align: right;
}

.case-actions {
    margin-top: 12px;
    display: flex;
    gap: 10px;
}

.btn-success {
    background: #2e7d32;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 8px;
    cursor: pointer;
}

.btn-delete {
    background: #c62828;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 8px;
    cursor: pointer;
}

/* ---------- Case Card Professional Style ---------- */

.case-card {
    background: #ffffff;
    padding: 20px;
    border-radius: 16px;
    margin-bottom: 16px;
    border: 1px solid #e4e9f0;
    cursor: pointer;
}

.case-card:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
}

.case-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-size: 14px;
    color: #2c3e50;
}

.grid-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: flex-start;
}

.grid-row span {
    display: block;
    min-width: 140px;
    flex: 1;
    word-break: break-word;
}

.grid-row.single {
    grid-template-columns: 1fr;
}

/* ทำ label ดูบาลานซ์ */
.case-grid strong {
    font-weight: 600;
    margin-right: 4px;
}

.top-row {
    font-weight: 600;
    margin-bottom: 12px;
}

.case-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 12px;
}

/* ---------- Buttons ---------- */

.btn-success {
    background: #0d47a1;
    color: white;
    border: none;
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 13px;
    cursor: pointer;
}

.btn-success:hover {
    background: #1565c0;
}

.btn-delete {
    background: #e53935;
    color: white;
    border: none;
    padding: 8px 18px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: 0.2s ease;
}

.btn-delete:hover {
    background: #c62828;
    transform: translateY(-1px);
}

/* ---------- Floating Add Button ---------- */

.floating-add-btn {
    position: fixed;
    bottom: 30px;
    right: 30px;
    background: #1a3a5f;
    color: white;
    border: none;
    padding: 15px 25px;
    border-radius: 30px;
    font-size: 16px;
    font-weight: bold;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    cursor: pointer;
    transition: 0.3s ease;
    z-index: 1000;
}

.floating-add-btn:hover {
    background: #244b7a;
    transform: translateY(-3px);
}

/* ---------- Detail Modal ---------- */

.detail-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 5000;
}

.detail-card {
    background: white;
    width: 90%;
    max-width: 450px;
    padding: 28px;
    border-radius: 18px;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
}

.detail-card h2 {
    margin-bottom: 20px;
    color: #1a3a5f;
}

.detail-grid p {
    margin-bottom: 10px;
    font-size: 14px;
    color: #333;
}

.close-detail-btn {
    margin-top: 20px;
    width: 100%;
    background: #1a3a5f;
    color: white;
    border: none;
    padding: 10px;
    border-radius: 10px;
    cursor: pointer;
}

.add-btn-wrapper {
    display: flex;
    justify-content: center;
    margin-top: 28px;
}

.add-btn {
    background: #1a3a5f;
    color: white;
    border: none;
    padding: 14px 20px;
    border-radius: 40px;
    font-weight: 600;
    font-size: 15px;
    cursor: pointer;
    transition: 0.25s ease;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
    margin-block: 10px;
}

.add-btn:hover {
    background: #244b7a;
    transform: translateY(-2px);
}

.case-detail {
    margin-top: 14px;
    padding: 14px;
    background: #f8fafc;
    border-radius: 10px;
    border: 1px solid #e3e8ef;
    font-size: 13px;
    line-height: 1.6;
}

.detail-row {
    margin-bottom: 6px;
}

/* animation */
.expand-enter-active,
.expand-leave-active {
    transition: all 0.25s ease;
}

.expand-enter-from,
.expand-leave-to {
    opacity: 0;
    transform: translateY(-6px);
}

.detail-box {
    margin-top: 15px;
    padding: 15px;
    background: #f5f7fa;
    border-radius: 10px;
    font-size: 14px;
    line-height: 1.6;
    border: 1px solid #e0e6ed;
}

/* 🔥 แก้ไข Checkbox ให้เกาะกลุ่มกันสวยๆ */
.checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-left: 10px;
}

.check-label {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-start !important;
    /* บังคับชิดซ้าย */
    gap: 10px !important;
    /* ระยะห่างระหว่างกล่องกับข้อความ */
    width: fit-content !important;
    /* 👈 สำคัญ: ไม่ให้กล่องยาวเต็มบรรทัด */
    cursor: pointer;
}

input[type="checkbox"] {
    width: 20px !important;
    height: 20px !important;
    margin: 0 !important;
    flex-shrink: 0;
}

.drag-item {
    cursor: grab;
}

.drag-item:active {
    cursor: grabbing;
}

/* ปุ่มรีเซ็ต */
.reset-wrapper {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 10px;
    padding-right: 10px;
}

.btn-reset {
    display: flex;
    align-items: center;
    gap: 5px;
    background: #f0f2f5;
    color: #555;
    border: 1px solid #ddd;
    padding: 6px 12px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: 0.2s;
}

.btn-reset:hover {
    background: #e4e6e9;
    color: #1a3a5f;
}

.btn-reset .material-icons {
    font-size: 16px;
}

/* ===== OR CAPACITY ===== */

.or-capacity-card {
    width: 100%;
    max-width: 340px;
    margin: 0 auto 20px auto;

    background: #ffffff;
    border-radius: 15px;

    padding: 14px 5px;

    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

    border: 1px solid #e5e7eb;
}

.capacity-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    font-size: 14px;
    font-weight: 700;

    color: #1e3a8a;

    margin-bottom: 10px;
}

.capacity-title {
    display: flex;
    align-items: center;
    gap: 6px;
}

.capacity-title .material-icons {
    font-size: 18px;
}

.capacity-bar {
    width: 100%;
    height: 10px;

    background: #e5e7eb;

    border-radius: 999px;
    overflow: hidden;

    margin-bottom: 10px;
}

.capacity-fill {
    height: 100%;
    border-radius: 999px;

    transition: 0.3s ease;
}

.capacity-detail {
    display: flex;
    justify-content: space-between;
    align-items: center;

    font-size: 12px;
    color: #4b5563;
}

.remaining-time {
    display: flex;
    align-items: center;
    gap: 4px;
}

.capacity-status {
    display: flex;
    align-items: center;
    gap: 4px;

    font-weight: 600;
    color: #16a34a;
}

.capacity-status.warning {
    color: #f59e0b;
}

.capacity-status.danger {
    color: #dc2626;
}

.small-icon {
    font-size: 15px;
}




.btn-restore {

    display: flex;
    align-items: center;
    gap: 6px;

    background: #ffc400;
    color: rgb(0, 0, 0);

    border: none;
    border-radius: 10px;

    padding: 8px 14px;

    cursor: pointer;
}

.btn-restore .material-icons {
    font-size: 18px;
}

/*.เสิรชบาร์*/

.top-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.search-box {
    display: flex;
    align-items: center;
    gap: 8px;

    background: white;
    border: 1px solid #d1d5db;
    border-radius: 14px;

    padding: 0 14px;

    width: 230px;

    height: 42px;

    margin-left: auto;

    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}


.search-box input {
    border: none;
    outline: none;
    width: 100%;
    font-size: 15px;
    background: transparent;
}

.search-icon {
    color: #6b7280;
    font-size: 22px;
}

.highlight-case {
    border: 2px solid #2563eb;
    box-shadow: 0 0 25px rgba(37, 99, 235, 0.45);
    animation: glowBlue 2s ease;
}

.highlight-case-yellow {
    border: 2px solid #facc15;
    box-shadow: 0 0 25px rgba(250, 204, 21, 0.5);
    animation: glowYellow 2s ease;
}

@keyframes glowBlue {
    0% {
        transform: scale(1);
    }

    30% {
        transform: scale(1.02);
    }

    100% {
        transform: scale(1);
    }
}

@keyframes glowYellow {
    0% {
        transform: scale(1);
    }

    30% {
        transform: scale(1.02);
    }

    100% {
        transform: scale(1);
    }
}

@keyframes glowHighlight {

    0% {
        transform: scale(1);
    }

    30% {
        transform: scale(1.02);
    }

    100% {
        transform: scale(1);
    }
}

@media (max-width: 768px) {

    .top-nav {
        gap: 10px;
        padding: 0 12px;
    }

    .search-box {
        flex: 1;
        max-width: unset;
        height: 30px;
        padding: 0 16px;
        margin-left: 90px;
    }

    .search-box input {
        font-size: 16px;
    }

    .search-icon {
        font-size: 26px;
    }

    .top-nav {
        padding: 0 12px;
    }

    .search-box {
        height: 40px;
    }

    .search-box input {
        font-size: 16px;
    }

    .search-icon {
        font-size: 26px;
    }

    .case-card {
        padding: 14px;
    }

    .grid-row {
        flex-direction: column;
        gap: 4px;
    }

    .grid-row span {
        width: 100%;
        min-width: unset;
    }

    .case-grid {
        gap: 8px;
        font-size: 13px;
    }


}

.dp__theme_light {
    --dp-border-radius: 16px;
    --dp-font-family: inherit;
}

.dp__menu {
    border-radius: 20px;
}
</style>
<style>
/* CSS สำหรับปฏิทินที่ Teleport ไปที่ body */
.is-thai-holiday {
    color: #dc2626 !important;
    font-weight: bold !important;
}


/* ---------- See More Toggle ---------- */
.see-more-toggle {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-top: 12px;
    margin-bottom: -50px;
    /* 🟢 ใช้ค่าติดลบเพื่อดึงให้ชิดขอบล่างสุดของการ์ด */
    color: #94a3b8;
    transition: all 0.25s ease;
}

/* ตอนเอาเมาส์ชี้ให้สีเข้มขึ้นนิดนึง */
.case-card:hover .see-more-toggle {
    color: #475569;
}

.see-more-text {
    font-size: 13px;
    font-weight: 500;
}

.see-more-icon {
    font-size: 24px;
    margin-top: -6px;
    /* ดึงลูกศรให้ชิดตัวหนังสือมากขึ้น */
}



/* แถม: สไตล์ปุ่มจับลากให้ดูน่ากด */
.drag-handle {
    cursor: grab;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: -15px;

}

.drag-handle:active {
    cursor: grabbing;
}

.btn-edit {
    background: #ffd92d;
    color: rgb(0, 0, 0);
    border: none;
    padding: 8px 18px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: 0.2s ease;
}

.btn-edit:hover {
    background: #dec400;
    transform: translateY(-1px);
}
</style>