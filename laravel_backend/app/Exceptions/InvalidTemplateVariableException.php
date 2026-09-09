<?php

namespace App\Exceptions;

use Exception;

class InvalidTemplateVariableException extends Exception
{
    /**
     * @var string[]
     */
    public array $unknownVariables;

    /**
     * @param string[] $unknownVariables
     */
    public function __construct(array $unknownVariables)
    {
        $this->unknownVariables = array_values($unknownVariables);

        parent::__construct('Invalid template variable');
    }
}
