<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Template Categories
    |--------------------------------------------------------------------------
    |
    | Centralized list of message template categories exposed to the frontend
    | via GET /api/templates/meta. Keeps the UI in sync without hardcoding.
    |
    */
    'categories' => [
        'Marketing',
        'Utility',
        'Authentication',
        'Transactional',
        'Reminder',
        'Informational',
    ],

    /*
    |--------------------------------------------------------------------------
    | Supported Languages
    |--------------------------------------------------------------------------
    */
    'languages' => [
        'id',
        'en',
    ],

];
