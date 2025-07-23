export type JobState = 'pending' | 'claimed' | 'running' | 'failed' | 'completed' | 'canceled';

export type JobData = {
    id?: number;
    queue: string;
    state?: JobState;
    script: string;
    class: string;
    args: any[];
    attempt: number;
    max_attempts: number;
    result?: any;
    errors?: any[];
    inserted_at?: Date;
    attempted_at?: Date;
    available_at?: Date;
    completed_at?: Date;
    discarded_at?: Date;
    cancelled_at?: Date;
    claimed_at?: Date;
    claimed_by?: string;
}